/**
 * Phase 3 integratsiya testlari — ishlab turgan lokal server va seed qilingan baza talab qilinadi.
 *
 *   API_URL=http://localhost:4000 node --test test/
 *
 * Test PIN/parollar packages/db/prisma/seed.ts dagi DEV seed qiymatlari (env orqali almashtirish mumkin).
 * Hech qanday test PIN yoki hashni konsolga chiqarmaydi.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://localhost:4000';
const CASHIER = { username: process.env.TEST_CASHIER_USERNAME || 'kassir1', pin: process.env.TEST_CASHIER_PIN || '1111' };
const ADMIN = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  pin: process.env.TEST_ADMIN_PIN || '0000',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
};

async function call(method, path, { body, token, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* body bo'sh */
  }
  return { status: res.status, json, headers: res.headers };
}

const unwrap = (r) => r.json?.data;
const errMessage = (r) => JSON.stringify(r.json?.message ?? r.json?.error ?? r.json);

let staff = [];
let cashierTokens;
let adminTokens;

before(async () => {
  const health = await call('GET', '/health');
  assert.equal(health.status, 200, `Server ishlamayapti: ${API}`);
  assert.equal(unwrap(health).database, 'up', 'Baza ulanmagan');
});

describe('DB / Health', () => {
  test('DB-01 health endpoint reports database up', async () => {
    const r = await call('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(unwrap(r).status, 'ok');
  });
});

describe('PIN authentication', () => {
  test('AUTH-01 GET /auth/staff returns selectable staff without secrets', async () => {
    const r = await call('GET', '/auth/staff');
    assert.equal(r.status, 200);
    staff = unwrap(r);
    assert.ok(Array.isArray(staff) && staff.length > 0, 'staff ro\'yxati bo\'sh');
    for (const s of staff) {
      assert.deepEqual(Object.keys(s).sort(), ['id', 'name', 'role']);
    }
  });

  test('AUTH-02 valid cashier (selected by id) + PIN → 200 with tokens', async () => {
    const cashier = staff.find((s) => s.role === 'CASHIER');
    assert.ok(cashier, 'kassir topilmadi');
    const r = await call('POST', '/auth/pin-login', {
      body: { userIdentifier: cashier.id, pin: CASHIER.pin, deviceId: 'kassa-pos-01' },
    });
    assert.equal(r.status, 200, errMessage(r));
    cashierTokens = unwrap(r);
    assert.ok(cashierTokens.accessToken && cashierTokens.refreshToken);
    assert.equal(cashierTokens.user.role, 'CASHIER');
    assert.equal(cashierTokens.expiresIn, 15 * 60);
    assert.ok(!('pinHash' in cashierTokens.user) && !('passwordHash' in cashierTokens.user));
  });

  test('AUTH-03 wrong PIN → 401 generic message', async () => {
    const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: CASHIER.username, pin: '9876' } });
    assert.equal(r.status, 401);
    assert.match(errMessage(r), /PIN kod noto'g'ri/);
  });

  test('AUTH-04 unknown user → 401 with the same generic message (no user enumeration)', async () => {
    const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: 'no-such-user-xyz', pin: '1234' } });
    assert.equal(r.status, 401);
    assert.match(errMessage(r), /Xodim yoki PIN kod noto'g'ri/);
  });

  test('AUTH-05 legacy PIN-only payload {pin} → 400 validation error', async () => {
    const r = await call('POST', '/auth/pin-login', { body: { pin: CASHIER.pin } });
    assert.equal(r.status, 400);
  });

  test('AUTH-06 non-numeric / short PIN → 400', async () => {
    const a = await call('POST', '/auth/pin-login', { body: { userIdentifier: CASHIER.username, pin: '12ab' } });
    const b = await call('POST', '/auth/pin-login', { body: { userIdentifier: CASHIER.username, pin: '12' } });
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
  });

  test('AUTH-07 lockout after 5 failed attempts → 429', async () => {
    const probe = `lockout-probe-${Date.now()}`;
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: probe, pin: '0001' } });
      statuses.push(r.status);
    }
    assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
  });

  test('AUTH-08 admin PIN login → role ADMIN', async () => {
    const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: ADMIN.username, pin: ADMIN.pin } });
    assert.equal(r.status, 200, errMessage(r));
    adminTokens = unwrap(r);
    assert.equal(adminTokens.user.role, 'ADMIN');
  });

  test('AUTH-09 admin password login works; cashier (no password) is rejected', async () => {
    const ok = await call('POST', '/auth/login', { body: { username: ADMIN.username, password: ADMIN.password } });
    assert.equal(ok.status, 200, errMessage(ok));
    const bad = await call('POST', '/auth/login', { body: { username: CASHIER.username, password: 'whatever123' } });
    assert.equal(bad.status, 401);
  });
});

describe('JWT session', () => {
  test('JWT-01 /auth/me with valid token → 200 and correct user', async () => {
    const r = await call('GET', '/auth/me', { token: cashierTokens.accessToken });
    assert.equal(r.status, 200);
    assert.equal(unwrap(r).username, CASHIER.username);
    assert.equal(unwrap(r).deviceId, 'kassa-pos-01', 'deviceId JWT ga yozilmagan (DTO whitelist)');
  });

  test('JWT-02 no token → 401; tampered token → 401', async () => {
    assert.equal((await call('GET', '/auth/me')).status, 401);
    const t = cashierTokens.accessToken;
    const tampered = t.slice(0, -4) + (t.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    assert.equal((await call('GET', '/auth/me', { token: tampered })).status, 401);
  });

  test('JWT-03 refresh token → new tokens; access token cannot be used as refresh', async () => {
    const ok = await call('POST', '/auth/refresh', { body: { refreshToken: cashierTokens.refreshToken } });
    assert.equal(ok.status, 200);
    assert.ok(unwrap(ok).accessToken);
    const bad = await call('POST', '/auth/refresh', { body: { refreshToken: cashierTokens.accessToken } });
    assert.equal(bad.status, 401);
  });

  test('JWT-04 refresh token cannot be used as access token', async () => {
    const r = await call('GET', '/auth/me', { token: cashierTokens.refreshToken });
    assert.equal(r.status, 401);
  });
});

describe('Role-based authorization', () => {
  test('RBAC-01 cashier can read menu categories', async () => {
    const r = await call('GET', '/categories', { token: cashierTokens.accessToken });
    assert.equal(r.status, 200);
  });

  test('RBAC-02 cashier is forbidden from admin reports → 403', async () => {
    const r = await call('GET', '/reports/dashboard', { token: cashierTokens.accessToken });
    assert.equal(r.status, 403);
  });

  test('RBAC-03 cashier cannot create menu items → 403', async () => {
    const r = await call('POST', '/menu-items', { token: cashierTokens.accessToken, body: { name: 'x', price: 1 } });
    assert.equal(r.status, 403);
  });

  test('RBAC-04 admin can read admin reports → 200', async () => {
    const r = await call('GET', '/reports/dashboard', { token: adminTokens.accessToken });
    assert.equal(r.status, 200, errMessage(r));
  });
});

describe('CORS', () => {
  const preflight = (origin) =>
    fetch(`${API}/auth/pin-login`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });

  test('CORS-01 POS dev origin (localhost:5173) allowed', async () => {
    const r = await preflight('http://localhost:5173');
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('CORS-02 private LAN origin allowed (CORS_ALLOW_PRIVATE_LAN=true)', async () => {
    const r = await preflight('http://192.168.1.50:5173');
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://192.168.1.50:5173');
  });

  test('CORS-03 foreign internet origin rejected', async () => {
    const r = await preflight('https://evil.example.com');
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });

  test('CORS-04 no wildcard origin', async () => {
    const r = await preflight('http://localhost:3000');
    assert.notEqual(r.headers.get('access-control-allow-origin'), '*');
  });
});

describe('KDS WebSocket (Socket.IO)', () => {
  const sockets = [];
  after(() => sockets.forEach((s) => s.disconnect()));

  const connect = (auth) =>
    new Promise((resolve) => {
      const s = io(API, { auth, transports: ['websocket'], reconnection: false, timeout: 4000 });
      sockets.push(s);
      let authError = null;
      s.on('auth:error', (e) => (authError = e));
      s.on('connect', () => {
        // Server tokenni handleConnection da tekshiradi; rad etsa darhol uzadi.
        setTimeout(() => resolve({ socket: s, connected: s.connected, authError }), 300);
      });
      s.on('connect_error', (e) => resolve({ socket: s, connected: false, error: e.message, authError }));
    });

  test('WS-01 connection without token is rejected', async () => {
    const r = await connect(undefined);
    assert.equal(r.connected, false);
  });

  test('WS-02 connection with invalid token is rejected', async () => {
    const r = await connect({ token: 'not-a-jwt' });
    assert.equal(r.connected, false);
  });

  test('WS-03 connection with valid token stays connected; ping → pong', async () => {
    const { socket, connected } = await connect({ token: cashierTokens.accessToken });
    assert.equal(connected, true);
    const pong = await new Promise((resolve, reject) => {
      socket.once('pong', resolve);
      socket.emit('ping');
      setTimeout(() => reject(new Error('pong kelmadi')), 3000);
    });
    assert.ok(pong.timestamp);
  });

  test('WS-04 KDS receives kitchen:new-ticket when cashier sends order to kitchen', async () => {
    const { socket, connected } = await connect({ token: adminTokens.accessToken });
    assert.equal(connected, true);

    const items = await call('GET', '/menu-items', { token: cashierTokens.accessToken });
    assert.equal(items.status, 200, errMessage(items));
    const list = Array.isArray(unwrap(items)) ? unwrap(items) : unwrap(items).items ?? unwrap(items).data;
    const menuItem = list.find((m) => m.isAvailable !== false);
    assert.ok(menuItem, 'menyu bo\'sh');

    const ticketPromise = new Promise((resolve, reject) => {
      socket.once('kitchen:new-ticket', resolve);
      setTimeout(() => reject(new Error('kitchen:new-ticket kelmadi')), 5000);
    });

    const order = await call('POST', '/orders', {
      token: cashierTokens.accessToken,
      body: { type: 'TAKEAWAY', notes: 'phase3-integration-test', items: [{ menuItemId: menuItem.id, quantity: 1 }] },
    });
    assert.ok([200, 201].includes(order.status), errMessage(order));
    const orderId = unwrap(order).id;

    const sent = await call('POST', `/orders/${orderId}/send-kitchen`, { token: cashierTokens.accessToken });
    assert.ok([200, 201].includes(sent.status), errMessage(sent));

    const ticket = await ticketPromise;
    assert.equal(ticket.orderId, orderId);
    assert.ok(ticket.items.length >= 1);

    // KDS REST: ochiq oshxona chiptalari ro'yxatida ko'rinadi
    const tickets = await call('GET', '/orders/kitchen/tickets', { token: adminTokens.accessToken });
    assert.equal(tickets.status, 200);
    assert.ok(unwrap(tickets).some((o) => o.id === orderId));

    // Tozalash: test buyurtmasini bekor qilish
    await call('POST', `/orders/${orderId}/cancel`, {
      token: adminTokens.accessToken,
      body: { reason: 'phase3 integration test cleanup' },
    });
  });
});
