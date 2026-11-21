/**
 * Phase 4 / 1-bosqich: Menyu va Kategoriyalar (Admin ↔ POS) integratsiya testlari.
 * Ishlab turgan lokal server + seed qilingan DEV baza kerak:
 *   API_URL=http://localhost:4000 node --test test/
 * Testlar o'zlari yaratgan yozuvlarni o'chiradi (soft-delete).
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://localhost:4000';
const CASHIER_PIN = process.env.TEST_CASHIER_PIN || '1111';
const ADMIN = { username: process.env.TEST_ADMIN_USERNAME || 'admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin123' };
const RUN = Date.now().toString(36);

async function call(method, path, { body, token, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh */
  }
  return { status: res.status, json, headers: res.headers, data: json?.data };
}
const msg = (r) => JSON.stringify(r.json?.message ?? r.json);

let admin;
let cashier;
let category;
let item;
const sockets = [];

function listen(token) {
  return new Promise((resolve, reject) => {
    const s = io(API, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    const events = [];
    s.on('menu:updated', (e) => events.push(e));
    s.on('connect', () => setTimeout(() => (s.connected ? resolve({ s, events }) : reject(new Error('rejected'))), 200));
    s.on('connect_error', reject);
  });
}
const waitFor = async (events, pred, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const hit = events.find(pred);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('menu:updated hodisasi kelmadi');
};

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const fileForm = (buf, name, type) => {
  const f = new FormData();
  f.append('file', new Blob([buf], { type }), name);
  return f;
};

before(async () => {
  const a = await call('POST', '/auth/login', { body: ADMIN });
  assert.equal(a.status, 200, msg(a));
  admin = a.data;
  const staff = (await call('GET', '/auth/staff')).data;
  const c = staff.find((s) => s.role === 'CASHIER');
  const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: c.id, pin: CASHIER_PIN } });
  assert.equal(r.status, 200, msg(r));
  cashier = r.data;
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  if (item) await call('DELETE', `/menu-items/${item.id}`, { token: admin.accessToken });
  if (category) await call('DELETE', `/categories/${category.id}`, { token: admin.accessToken });
});

describe('Categories (Admin)', () => {
  test('CAT-01 admin creates category → 201, POS cashier receives menu:updated', async () => {
    const { events } = await listen(cashier.accessToken);
    const r = await call('POST', '/categories', {
      token: admin.accessToken,
      body: { name: `Test kategoriya ${RUN}`, color: '#0EA5E9', icon: '🧪', sortOrder: 99 },
    });
    assert.equal(r.status, 201, msg(r));
    category = r.data;
    await waitFor(events, (e) => e.entity === 'category' && e.action === 'created' && e.id === category.id);
  });

  test('CAT-02 duplicate name (case-insensitive) → 409', async () => {
    const r = await call('POST', '/categories', { token: admin.accessToken, body: { name: `test KATEGORIYA ${RUN}` } });
    assert.equal(r.status, 409);
  });

  test('CAT-03 invalid color / long name → 400', async () => {
    assert.equal((await call('POST', '/categories', { token: admin.accessToken, body: { name: 'x', color: 'red' } })).status, 400);
    assert.equal((await call('POST', '/categories', { token: admin.accessToken, body: { name: 'x'.repeat(81) } })).status, 400);
  });

  test('CAT-04 cashier cannot create/update/delete categories → 403', async () => {
    const t = cashier.accessToken;
    assert.equal((await call('POST', '/categories', { token: t, body: { name: 'hack' } })).status, 403);
    assert.equal((await call('PATCH', `/categories/${category.id}`, { token: t, body: { name: 'hack' } })).status, 403);
    assert.equal((await call('DELETE', `/categories/${category.id}`, { token: t })).status, 403);
  });

  test('CAT-05 cashier sees the new category in GET /categories', async () => {
    const r = await call('GET', '/categories', { token: cashier.accessToken });
    assert.ok(r.data.some((c) => c.id === category.id));
  });

  test('CAT-06 admin edits category → persisted', async () => {
    const r = await call('PATCH', `/categories/${category.id}`, { token: admin.accessToken, body: { nameRu: 'Тест' } });
    assert.equal(r.status, 200, msg(r));
    const again = await call('GET', `/categories/${category.id}`, { token: admin.accessToken });
    assert.equal(again.data.nameRu, 'Тест');
  });
});

describe('Image upload', () => {
  let imageUrl;

  test('IMG-01 admin uploads PNG → 201 and file is served with nosniff', async () => {
    const r = await call('POST', '/uploads/menu-image', { token: admin.accessToken, form: fileForm(PNG, 'a.png', 'image/png') });
    assert.equal(r.status, 201, msg(r));
    imageUrl = r.data.url;
    assert.match(imageUrl, /^\/uploads\/menu\/[0-9a-f-]+\.png$/);
    const img = await fetch(`${API}${imageUrl}`);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(img.headers.get('content-type'), 'image/png');
  });

  test('IMG-02 fake image (text renamed .png) and SVG → 400', async () => {
    const a = await call('POST', '/uploads/menu-image', { token: admin.accessToken, form: fileForm(Buffer.from('hello'), 'x.png', 'image/png') });
    const b = await call('POST', '/uploads/menu-image', {
      token: admin.accessToken,
      form: fileForm(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'x.svg', 'image/svg+xml'),
    });
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
  });

  test('IMG-03 file > 2 MB → 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const r = await call('POST', '/uploads/menu-image', { token: admin.accessToken, form: fileForm(big, 'big.png', 'image/png') });
    assert.equal(r.status, 413);
  });

  test('IMG-04 cashier / anonymous cannot upload → 403 / 401', async () => {
    assert.equal((await call('POST', '/uploads/menu-image', { token: cashier.accessToken, form: fileForm(PNG, 'a.png', 'image/png') })).status, 403);
    assert.equal((await call('POST', '/uploads/menu-image', { form: fileForm(PNG, 'a.png', 'image/png') })).status, 401);
  });

  test('IMG-05 directory listing / path traversal not served', async () => {
    assert.notEqual((await fetch(`${API}/uploads/menu/`)).status, 200);
    assert.notEqual((await fetch(`${API}/uploads/menu/..%2F..%2F.env`)).status, 200);
  });

  test('MENU-01 admin creates menu item with uploaded image → POS receives event', async () => {
    const { events } = await listen(cashier.accessToken);
    const r = await call('POST', '/menu-items', {
      token: admin.accessToken,
      body: {
        name: `Test taom ${RUN}`,
        price: 30000,
        costPrice: 12000,
        unit: 'PORTION',
        categoryId: category.id,
        imageUrl,
        kitchenStationId: 'Issiq sex',
      },
    });
    assert.equal(r.status, 201, msg(r));
    item = r.data;
    assert.equal(item.imageUrl, imageUrl);
    await waitFor(events, (e) => e.entity === 'menu_item' && e.action === 'created' && e.id === item.id);
  });
});

describe('Menu items (Admin ↔ POS)', () => {
  test('MENU-02 external / javascript image URLs rejected → 400', async () => {
    for (const bad of ['https://evil.example/x.png', 'javascript:alert(1)', '/uploads/menu/../../.env']) {
      const r = await call('PATCH', `/menu-items/${item.id}`, { token: admin.accessToken, body: { imageUrl: bad } });
      assert.equal(r.status, 400, bad);
    }
  });

  test('MENU-03 cashier sees new item, without cost/profit fields', async () => {
    const r = await call('GET', `/menu-items?categoryId=${category.id}`, { token: cashier.accessToken });
    const found = r.data.find((m) => m.id === item.id);
    assert.ok(found, 'POS yangi taomni ko\'rmadi');
    for (const f of ['costPrice', 'profit', 'markupPercent', 'marginPercent']) assert.ok(!(f in found), `${f} kassirga ochiq`);
    const adminView = await call('GET', `/menu-items/${item.id}`, { token: admin.accessToken });
    assert.equal(adminView.data.costPrice, 12000);
  });

  test('MENU-04 cashier search finds the item', async () => {
    const r = await call('GET', `/menu-items?search=${encodeURIComponent(`taom ${RUN}`)}`, { token: cashier.accessToken });
    assert.deepEqual(r.data.map((m) => m.id), [item.id]);
  });

  test('MENU-05 price change (/price) → history + POS event + POS sees new price', async () => {
    const { events } = await listen(cashier.accessToken);
    const r = await call('PATCH', `/menu-items/${item.id}/price`, {
      token: admin.accessToken,
      body: { newPrice: 32000, reason: 'test' },
    });
    assert.equal(r.status, 200, msg(r));
    await waitFor(events, (e) => e.action === 'price_changed' && e.id === item.id && e.price === 32000);
    const pos = await call('GET', `/menu-items/${item.id}`, { token: cashier.accessToken });
    assert.equal(pos.data.price, 32000);
    const hist = await call('GET', `/menu-items/${item.id}/price-history`, { token: admin.accessToken });
    assert.deepEqual(hist.data.slice(0, 2).map((h) => [h.oldPrice, h.newPrice]), [[30000, 32000], [0, 30000]]);
  });

  test('MENU-06 price changed via general PATCH is also recorded in history', async () => {
    const r = await call('PATCH', `/menu-items/${item.id}`, { token: admin.accessToken, body: { price: 33000 } });
    assert.equal(r.status, 200, msg(r));
    const hist = await call('GET', `/menu-items/${item.id}/price-history`, { token: admin.accessToken });
    assert.deepEqual([hist.data[0].oldPrice, hist.data[0].newPrice], [32000, 33000]);
  });

  test('MENU-07 order uses server price, not client price', async () => {
    const r = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: item.id, quantity: 2, unitPrice: 1 }] },
    });
    assert.ok([200, 201].includes(r.status), msg(r));
    assert.equal(r.data.items?.[0]?.unitPrice ?? r.data.subtotal / 2, 33000);
    await call('POST', `/orders/${r.data.id}/cancel`, { token: admin.accessToken, body: { reason: 'test cleanup' } });
  });

  test('MENU-08 item taken off sale → POS event, order with it rejected (400)', async () => {
    const { events } = await listen(cashier.accessToken);
    const r = await call('PATCH', `/menu-items/${item.id}/availability`, { token: admin.accessToken, body: { isAvailable: false } });
    assert.equal(r.status, 200, msg(r));
    await waitFor(events, (e) => e.action === 'availability_changed' && e.id === item.id && e.isAvailable === false);
    const order = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: item.id, quantity: 1 }] },
    });
    assert.equal(order.status, 400, msg(order));
    assert.match(msg(order), /sotuvda yo'q/);
  });

  test('MENU-09 availability body must be boolean → 400', async () => {
    const r = await call('PATCH', `/menu-items/${item.id}/availability`, { token: admin.accessToken, body: { isAvailable: 'false' } });
    assert.equal(r.status, 400);
  });

  test('MENU-10 cashier cannot create/edit price/delete items → 403', async () => {
    const t = cashier.accessToken;
    assert.equal((await call('PATCH', `/menu-items/${item.id}/price`, { token: t, body: { newPrice: 1 } })).status, 403);
    assert.equal((await call('PATCH', `/menu-items/${item.id}`, { token: t, body: { price: 1 } })).status, 403);
    assert.equal((await call('DELETE', `/menu-items/${item.id}`, { token: t })).status, 403);
  });

  test('MENU-11 cannot delete category that still has items → 409', async () => {
    const r = await call('DELETE', `/categories/${category.id}`, { token: admin.accessToken });
    assert.equal(r.status, 409);
  });

  test('MENU-12 deleted item disappears from POS and cannot be ordered (404)', async () => {
    const { events } = await listen(cashier.accessToken);
    const d = await call('DELETE', `/menu-items/${item.id}`, { token: admin.accessToken });
    assert.equal(d.status, 200, msg(d));
    await waitFor(events, (e) => e.action === 'deleted' && e.id === item.id);
    const list = await call('GET', '/menu-items', { token: cashier.accessToken });
    assert.ok(!list.data.some((m) => m.id === item.id));
    const order = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: item.id, quantity: 1 }] },
    });
    assert.equal(order.status, 404);
    item = null;
  });

  test('MENU-13 empty category can now be deleted', async () => {
    const r = await call('DELETE', `/categories/${category.id}`, { token: admin.accessToken });
    assert.equal(r.status, 200, msg(r));
    category = null;
  });
});

describe('Order item integrity', () => {
  test('ORD-01 modifier from another dish is rejected; modifier price comes from DB', async () => {
    const all = (await call('GET', '/menu-items', { token: admin.accessToken })).data;
    const withMods = all.find((m) => m.modifierGroups?.some((g) => g.modifiers.length));
    const other = all.find((m) => m.id !== withMods?.id && m.isAvailable);
    assert.ok(withMods && other, 'seedda modifierli taom yo\'q');
    const mod = withMods.modifierGroups.flatMap((g) => g.modifiers).find((m) => m.price > 0);

    const foreign = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: other.id, quantity: 1, modifiers: [{ modifierId: mod.id, name: 'x', price: -100000 }] }] },
    });
    assert.equal(foreign.status, 400, msg(foreign));

    const ok = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: withMods.id, quantity: 1, modifiers: [{ modifierId: mod.id, name: 'x', price: -100000 }] }] },
    });
    assert.ok([200, 201].includes(ok.status), msg(ok));
    const created = ok.data.items?.[0];
    assert.equal(created.unitPrice, withMods.price + mod.price, 'modifier narxi mijozdan olingan');
    await call('POST', `/orders/${ok.data.id}/cancel`, { token: admin.accessToken, body: { reason: 'test cleanup' } });
  });

  test('ORD-02 variant of another dish is rejected', async () => {
    const all = (await call('GET', '/menu-items', { token: admin.accessToken })).data;
    const withVar = all.find((m) => m.variants?.length);
    const other = all.find((m) => m.id !== withVar.id && m.isAvailable);
    const r = await call('POST', '/orders', {
      token: cashier.accessToken,
      body: { type: 'TAKEAWAY', items: [{ menuItemId: other.id, quantity: 1, variantId: withVar.variants[0].id }] },
    });
    assert.equal(r.status, 400, msg(r));
  });
});

describe('Audit & staff endpoint', () => {
  test('AUD-01 staff list exposes only id, name, role', async () => {
    const r = await call('GET', '/auth/staff');
    for (const s of r.data) assert.deepEqual(Object.keys(s).sort(), ['id', 'name', 'role']);
  });
});
