/**
 * Phase 5 / Batch 1: Buyurtma → Oshxona → To'lov → Chek → Ombor (to'liq ish jarayoni) + xavfsizlik.
 * Ishlab turgan lokal server + seed qilingan DEV baza kerak:  node --test test/
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://localhost:4000';
const CASHIER_PIN = process.env.TEST_CASHIER_PIN || '1111';
const ADMIN_PIN = process.env.TEST_ADMIN_PIN || '0000';
const ADMIN = { username: process.env.TEST_ADMIN_USERNAME || 'admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin123' };

async function call(method, path, { body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh */
  }
  return { status: res.status, json, data: json?.data };
}
const msg = (r) => JSON.stringify(r.json?.message ?? r.json);
const ok = (r) => assert.ok([200, 201].includes(r.status), msg(r));

let admin, cashier, A, C;
let menu, table, palov, palovRecipe, settings;
const sockets = [];
const cleanupOrders = [];

before(async () => {
  admin = (await call('POST', '/auth/login', { body: ADMIN })).data;
  const staff = (await call('GET', '/auth/staff')).data;
  cashier = (await call('POST', '/auth/pin-login', { body: { userIdentifier: staff.find((s) => s.role === 'CASHIER').id, pin: CASHIER_PIN, deviceId: 'kassa-pos-01' } })).data;
  A = admin.accessToken;
  C = cashier.accessToken;
  menu = (await call('GET', '/menu-items', { token: C })).data.filter((m) => m.isAvailable);
  palov = menu.find((m) => m.name.startsWith('Choyxona palov'));
  palovRecipe = (await call('GET', `/recipes/${palov.id}`, { token: A })).data;
  settings = (await call('GET', '/settings', { token: C })).data;

  // Bo'sh stolni topish (avvalgi test qoldiqlarini chetlab o'tish)
  const halls = (await call('GET', '/tables/halls', { token: C })).data;
  const tables = halls.flatMap((h) => h.tables);
  const open = (await call('GET', '/orders?isOpenOnly=true&take=200', { token: A })).data.items;
  table = tables.find((t) => !open.some((o) => o.table?.id === t.id));
  assert.ok(table, 'bo\'sh stol yo\'q');
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  for (const id of cleanupOrders) await call('POST', `/orders/${id}/cancel`, { token: A, body: { reason: 'test cleanup' } });
});

function kds(token) {
  return new Promise((resolve, reject) => {
    const s = io(API, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    const events = { ticket: [], item: [], order: [], table: [] };
    s.on('kitchen:new-ticket', (e) => events.ticket.push(e));
    s.on('kds:item-status', (e) => events.item.push(e));
    s.on('order:updated', (e) => events.order.push(e));
    s.on('table:status', (e) => events.table.push(e));
    s.on('connect', () => setTimeout(() => resolve(events), 150));
    s.on('connect_error', reject);
  });
}
const until = async (fn, ms = 3000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('kutilgan hodisa kelmadi');
};

describe('Settings', () => {
  test('SET-01 cashier reads settings; cannot change them', async () => {
    assert.ok(settings.RESTAURANT_NAME);
    assert.equal((await call('PATCH', '/settings', { token: C, body: { SERVICE_FEE_PERCENT: '0' } })).status, 403);
  });
  test('SET-02 invalid / unknown keys rejected (400)', async () => {
    assert.equal((await call('PATCH', '/settings', { token: A, body: { SERVICE_FEE_PERCENT: '99' } })).status, 400);
    assert.equal((await call('PATCH', '/settings', { token: A, body: { JWT_ACCESS_SECRET: 'x' } })).status, 400);
    assert.equal((await call('PATCH', '/settings', { token: A, body: { RECEIPT_PAPER_WIDTH: '72' } })).status, 400);
  });
});

describe('Full workflow: order → kitchen → payment → receipt → inventory', () => {
  const orderId = randomUUID();
  let order;
  let events;
  let ingBefore;

  test('WF-01 dine-in without table → 400', async () => {
    const r = await call('POST', '/orders', { token: C, body: { type: 'DINE_IN', items: [{ menuItemId: palov.id, quantity: 1 }] } });
    assert.equal(r.status, 400);
  });

  test('WF-02 cashier creates dine-in order (client UUID) — server prices, service fee', async () => {
    events = await kds(A);
    const ingredients = (await call('GET', '/ingredients', { token: A })).data;
    ingBefore = Object.fromEntries(ingredients.map((i) => [i.id, Number(i.currentQty)]));

    const r = await call('POST', '/orders', {
      token: C,
      body: { id: orderId, type: 'DINE_IN', tableId: table.id, items: [{ menuItemId: palov.id, quantity: 2, notes: 'piyozsiz', unitPrice: 1 }] },
    });
    assert.equal(r.status, 201, msg(r));
    order = r.data;
    assert.equal(order.id, orderId);
    assert.equal(order.subtotal, palov.price * 2);
    const fee = Math.round((order.subtotal * Number(settings.SERVICE_FEE_PERCENT)) / 100);
    assert.equal(order.serviceFee, fee);
    assert.equal(order.total, order.subtotal + fee);
    await until(() => events.table.find((t) => t.id === table.id && t.status === 'OCCUPIED'));
  });

  test('WF-03 same request again (retry/double click) → same order, no duplicate', async () => {
    const r = await call('POST', '/orders', { token: C, body: { id: orderId, type: 'DINE_IN', tableId: table.id, items: [{ menuItemId: palov.id, quantity: 2 }] } });
    ok(r);
    assert.equal(r.data.id, orderId);
    const list = (await call('GET', `/orders?tableId=${table.id}&isOpenOnly=true`, { token: C })).data;
    assert.equal(list.total, 1);
  });

  test('WF-04 second order on occupied table → 409 with activeOrderId', async () => {
    const r = await call('POST', '/orders', { token: C, body: { type: 'DINE_IN', tableId: table.id, items: [] } });
    assert.equal(r.status, 409);
  });

  test('WF-05 add item to the table order; totals recalculated', async () => {
    const tea = menu.find((m) => m.name.startsWith("Ko'k choy"));
    const r = await call('POST', `/orders/${orderId}/items`, { token: C, body: { menuItemId: tea.id, quantity: 1 } });
    ok(r);
    order = r.data;
    assert.equal(order.subtotal, palov.price * 2 + tea.price);
  });

  test('WF-06 discount: within cashier limit OK; above limit needs admin PIN', async () => {
    ok(await call('PATCH', `/orders/${orderId}/discount`, { token: C, body: { percent: 5 } }));
    assert.equal((await call('PATCH', `/orders/${orderId}/discount`, { token: C, body: { percent: 50 } })).status, 403);
    assert.equal((await call('PATCH', `/orders/${orderId}/discount`, { token: C, body: { percent: 50, approverPin: '9999' } })).status, 403);
    const withPin = await call('PATCH', `/orders/${orderId}/discount`, { token: C, body: { percent: 20, approverPin: ADMIN_PIN, note: 'test' } });
    ok(withPin);
    assert.equal(withPin.data.discount, Math.round(withPin.data.subtotal * 0.2));
    const back = await call('PATCH', `/orders/${orderId}/discount`, { token: C, body: { percent: 5 } });
    ok(back);
    order = back.data;
    const disc = Math.round(order.subtotal * 0.05);
    const fee = Math.round(((order.subtotal - disc) * Number(settings.SERVICE_FEE_PERCENT)) / 100);
    assert.equal(order.total, order.subtotal - disc + fee);
  });

  test('WF-07 send to kitchen → KDS socket ticket + listed in tickets', async () => {
    ok(await call('POST', `/orders/${orderId}/send-kitchen`, { token: C }));
    const ticket = await until(() => events.ticket.find((t) => t.orderId === orderId));
    assert.equal(ticket.items.length, 2);
    assert.ok(ticket.items.some((i) => i.notes === 'piyozsiz'));
    const tickets = (await call('GET', '/orders/kitchen/tickets', { token: A })).data;
    const mine = tickets.find((t) => t.id === orderId);
    assert.ok(mine);
    assert.ok(!('unitPrice' in mine.items[0]), 'oshxonaga narx yuborilmasligi kerak');
  });

  test('WF-08 KDS status: invalid value / transition → 400; COOKING → READY ok', async () => {
    const item = (await call('GET', `/orders/${orderId}`, { token: C })).data.items[0];
    assert.equal((await call('PATCH', `/orders/items/${item.id}/status`, { token: A, body: { status: 'DONE' } })).status, 400);
    assert.equal((await call('PATCH', `/orders/items/${item.id}/status`, { token: A, body: { status: 'SERVED' } })).status, 400);
    ok(await call('PATCH', `/orders/items/${item.id}/status`, { token: A, body: { status: 'READY' } }));
    await until(() => events.item.find((e) => e.itemId === item.id && e.status === 'READY'));
  });

  test('WF-09 payment validation: wrong sum / card change / short cash → 400', async () => {
    const t = order.total;
    assert.equal((await call('POST', `/orders/${orderId}/pay`, { token: C, body: { payments: [{ method: 'CASH', amount: t - 1, received: t }] } })).status, 400);
    assert.equal((await call('POST', `/orders/${orderId}/pay`, { token: C, body: { payments: [{ method: 'CARD', amount: t + 1000 }] } })).status, 400);
    assert.equal((await call('POST', `/orders/${orderId}/pay`, { token: C, body: { payments: [{ method: 'CARD', amount: t, received: t + 5 }] } })).status, 400);
    assert.equal((await call('POST', `/orders/${orderId}/pay`, { token: C, body: { payments: [{ method: 'CASH', amount: t, received: t - 1 }] } })).status, 400);
    assert.equal((await call('POST', `/orders/${orderId}/pay`, { token: C, body: { payments: [{ method: 'CASH', amount: -5 }] } })).status, 400);
  });

  let payResult;
  test('WF-10 split payment (cash + card), sent twice in parallel → exactly one succeeds', async () => {
    const t = order.total;
    const cash = Math.floor(t / 2);
    const body = { payments: [{ method: 'CASH', amount: cash, received: cash + 3000 }, { method: 'CARD', amount: t - cash }] };
    const [a, b] = await Promise.all([
      call('POST', `/orders/${orderId}/pay`, { token: C, body }),
      call('POST', `/orders/${orderId}/pay`, { token: C, body }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], `${a.status}/${b.status} ${msg(a)} ${msg(b)}`);
    payResult = (a.status === 201 ? a : b).data;
    assert.equal(payResult.change, 3000);
    assert.equal(payResult.totalPaid, t);
    const again = await call('POST', `/orders/${orderId}/pay`, { token: C, body });
    assert.equal(again.status, 409);
    const fresh = (await call('GET', `/orders?search=${payResult.orderNumber}`, { token: A })).data.items[0];
    assert.equal(fresh.payments.length, 2, 'ikki marta to\'lov yozilgan');
    assert.equal(fresh.status, 'PAID');
  });

  test('WF-11 receipt generated: number, items, totals, payments, change', async () => {
    const r = await call('GET', `/receipts/${payResult.receiptId}`, { token: C });
    ok(r);
    const text = r.data.content;
    assert.ok(text.includes(payResult.orderNumber));
    assert.ok(text.includes('Choyxona palov'));
    assert.ok(/[Qq]aytim/.test(text), 'qaytim chekda yo\'q');
    assert.ok([58, 80].includes(payResult.paperWidth));
  });

  test('WF-12 table freed after payment', async () => {
    const t = (await call('GET', `/tables/${table.id}`, { token: C })).data;
    assert.equal(t.status, 'AVAILABLE');
  });

  test('WF-13 inventory deducted by recipe × quantity (OUT_SALE movements)', async () => {
    const ingredients = (await call('GET', '/ingredients', { token: A })).data;
    const after = Object.fromEntries(ingredients.map((i) => [i.id, Number(i.currentQty)]));
    const recipeItems = palovRecipe.items ?? palovRecipe[0]?.items ?? [];
    assert.ok(recipeItems.length >= 3, `palov retsepti topilmadi: ${JSON.stringify(palovRecipe).slice(0, 120)}`);
    for (const ri of recipeItems) {
      const expected = Math.round((ingBefore[ri.ingredientId] - Number(ri.quantity) * 2) * 1000) / 1000;
      assert.equal(Math.round(after[ri.ingredientId] * 1000) / 1000, expected, `ingredient ${ri.ingredientId}`);
    }
    const moves = (await call('GET', '/stock/movements?type=OUT_SALE', { token: A })).data;
    const list = Array.isArray(moves) ? moves : moves.items ?? moves.data;
    assert.ok(list.some((m) => (m.reason || '').includes(payResult.orderNumber)));
  });

  test('WF-14 paid order stays on KDS until served', async () => {
    let tickets = (await call('GET', '/orders/kitchen/tickets', { token: A })).data;
    assert.ok(tickets.some((t) => t.id === orderId), 'to\'langan buyurtma oshxonadan yo\'qoldi');
    const items = (await call('GET', `/orders/${orderId}`, { token: A })).data.items;
    for (const it of items) {
      if (it.status === 'COOKING') ok(await call('PATCH', `/orders/items/${it.id}/status`, { token: A, body: { status: 'READY' } }));
      ok(await call('PATCH', `/orders/items/${it.id}/status`, { token: A, body: { status: 'SERVED' } }));
    }
    tickets = (await call('GET', '/orders/kitchen/tickets', { token: A })).data;
    assert.ok(!tickets.some((t) => t.id === orderId));
  });

  test('WF-15 paid order cannot be cancelled or edited', async () => {
    assert.equal((await call('POST', `/orders/${orderId}/cancel`, { token: A, body: { reason: 'x' } })).status, 400);
    const item = (await call('GET', `/orders/${orderId}`, { token: A })).data.items[0];
    assert.equal((await call('DELETE', `/orders/${orderId}/items/${item.id}`, { token: A })).status, 400);
    assert.equal((await call('POST', `/orders/${orderId}/items`, { token: C, body: { menuItemId: palov.id, quantity: 1 } })).status, 400);
  });

  test('WF-16 refund: cashier without/wrong PIN → 403; admin → 200; twice → 409', async () => {
    assert.equal((await call('POST', `/orders/${orderId}/refund`, { token: C, body: { reason: 'test' } })).status, 403);
    assert.equal((await call('POST', `/orders/${orderId}/refund`, { token: C, body: { reason: 'test', adminPin: '9998' } })).status, 403);
    ok(await call('POST', `/orders/${orderId}/refund`, { token: A, body: { reason: 'integration test refund' } }));
    assert.equal((await call('POST', `/orders/${orderId}/refund`, { token: A, body: { reason: 'again' } })).status, 409);
  });
});

describe('Cancel, takeaway & numbering', () => {
  test('CAN-01 cancel open order: wrong PIN 403, admin PIN 200, items cancelled', async () => {
    const r = await call('POST', '/orders', { token: C, body: { type: 'TAKEAWAY', items: [{ menuItemId: palov.id, quantity: 1 }] } });
    ok(r);
    const id = r.data.id;
    assert.equal((await call('POST', `/orders/${id}/cancel`, { token: C, body: { reason: 'x', adminPin: '1234' } })).status, 403);
    ok(await call('POST', `/orders/${id}/cancel`, { token: C, body: { reason: 'mijoz ketdi', adminPin: ADMIN_PIN } }));
    const o = (await call('GET', `/orders/${id}`, { token: A })).data;
    assert.equal(o.status, 'CANCELLED');
    assert.ok(o.items.every((i) => i.status === 'CANCELLED'));
    assert.equal((await call('POST', `/orders/${id}/pay`, { token: C, body: { payments: [{ method: 'CASH', amount: o.total }] } })).status, 400);
  });

  test('CAN-02 sent item removal requires approval; pending item removal does not', async () => {
    const r = await call('POST', '/orders', { token: C, body: { type: 'TAKEAWAY', items: [{ menuItemId: palov.id, quantity: 1 }] } });
    const id = r.data.id;
    cleanupOrders.push(id);
    ok(await call('POST', `/orders/${id}/send-kitchen`, { token: C }));
    const add = await call('POST', `/orders/${id}/items`, { token: C, body: { menuItemId: palov.id, quantity: 1 } });
    const [sent, pending] = add.data.items;
    assert.equal((await call('DELETE', `/orders/${id}/items/${sent.id}`, { token: C })).status, 403);
    ok(await call('DELETE', `/orders/${id}/items/${pending.id}`, { token: C }));
  });

  test('CAN-03 takeaway: pay first, kitchen still gets it', async () => {
    const r = await call('POST', '/orders', { token: C, body: { type: 'TAKEAWAY', items: [{ menuItemId: palov.id, quantity: 1 }] } });
    const o = r.data;
    ok(await call('POST', `/orders/${o.id}/send-kitchen`, { token: C }));
    ok(await call('POST', `/orders/${o.id}/pay`, { token: C, body: { payments: [{ method: 'CASH', amount: o.total, received: o.total }] } }));
    assert.equal(o.serviceFee, 0, 'olib ketishda xizmat haqi yo\'q');
    const tickets = (await call('GET', '/orders/kitchen/tickets', { token: A })).data;
    assert.ok(tickets.some((t) => t.id === o.id));
  });

  test('NUM-01 parallel orders get unique sequential numbers', async () => {
    const rs = await Promise.all(
      Array.from({ length: 6 }, () => call('POST', '/orders', { token: C, body: { type: 'TAKEAWAY', items: [{ menuItemId: palov.id, quantity: 1 }] } })),
    );
    rs.forEach(ok);
    const nums = rs.map((r) => r.data.orderNumber);
    assert.equal(new Set(nums).size, 6, nums.join(','));
    rs.forEach((r) => cleanupOrders.push(r.data.id));
  });

  test('LIST-01 search, filters and validation', async () => {
    const one = (await call('GET', '/orders?take=1', { token: A })).data;
    assert.equal(one.items.length, 1);
    const s = (await call('GET', `/orders?search=${one.items[0].orderNumber}`, { token: A })).data;
    assert.equal(s.items[0].id, one.items[0].id);
    assert.equal((await call('GET', '/orders?status=HACK', { token: A })).status, 400);
    assert.equal((await call('GET', '/orders?from=notadate', { token: A })).status, 400);
  });
});
