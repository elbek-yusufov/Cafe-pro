/**
 * Phase 5: Xodimlar/rollar (OWNER/ADMIN/MANAGER/CASHIER/KITCHEN), audit, hisobotlar va socket rol cheklovlari.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://localhost:4000';
const ADMIN = { username: process.env.TEST_ADMIN_USERNAME || 'admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin123' };
const CASHIER_PIN = process.env.TEST_CASHIER_PIN || '1111';
const RUN = Date.now().toString(36);

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
    /* */
  }
  return { status: res.status, json, data: json?.data };
}
const msg = (r) => JSON.stringify(r.json?.message ?? r.json);

let A, C, K, M;
const created = [];
const sockets = [];

before(async () => {
  A = (await call('POST', '/auth/login', { body: ADMIN })).data.accessToken;
  const staff = (await call('GET', '/auth/staff')).data;
  C = (await call('POST', '/auth/pin-login', { body: { userIdentifier: staff.find((s) => s.role === 'CASHIER').id, pin: CASHIER_PIN } })).data.accessToken;
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  for (const id of created) await call('PATCH', `/users/${id}`, { token: A, body: { isActive: false } });
});

describe('Staff management', () => {
  test('STAFF-01 list hides hashes; cashier forbidden', async () => {
    const r = await call('GET', '/users', { token: A });
    assert.equal(r.status, 200);
    for (const u of r.data) {
      assert.ok(!('pinHash' in u) && !('passwordHash' in u));
      assert.ok('hasPassword' in u);
    }
    assert.equal((await call('GET', '/users', { token: C })).status, 403);
  });

  test('STAFF-02 weak PIN / short password / KITCHEN without password rejected', async () => {
    const base = { name: 'Test', username: `t_${RUN}`, role: 'CASHIER' };
    assert.equal((await call('POST', '/users', { token: A, body: { ...base, pin: '1111' } })).status, 400);
    assert.equal((await call('POST', '/users', { token: A, body: { ...base, pin: '1234' } })).status, 400);
    assert.equal((await call('POST', '/users', { token: A, body: { ...base, role: 'KITCHEN', pin: '7391' } })).status, 400);
    assert.equal((await call('POST', '/users', { token: A, body: { ...base, role: 'MANAGER', pin: '7391', password: 'short' } })).status, 400);
    assert.equal((await call('POST', '/users', { token: A, body: { ...base, role: 'OWNER', pin: '7391', password: 'Owner-pass-123' } })).status, 403);
  });

  test('STAFF-03 admin creates KITCHEN and MANAGER; duplicate username → 409', async () => {
    const k = await call('POST', '/users', { token: A, body: { name: 'Oshpaz Test', username: `chef_${RUN}`, role: 'KITCHEN', pin: '7391', password: 'Kitchen-pass-123' } });
    assert.equal(k.status, 201, msg(k));
    created.push(k.data.id);
    const m = await call('POST', '/users', { token: A, body: { name: 'Menejer Test', username: `mgr_${RUN}`, role: 'MANAGER', pin: '8462', password: 'Manager-pass-123' } });
    assert.equal(m.status, 201, msg(m));
    created.push(m.data.id);
    assert.equal((await call('POST', '/users', { token: A, body: { name: 'x', username: `chef_${RUN}`, role: 'CASHIER', pin: '5927' } })).status, 409);
    K = (await call('POST', '/auth/login', { body: { username: `chef_${RUN}`, password: 'Kitchen-pass-123' } })).data.accessToken;
    M = (await call('POST', '/auth/login', { body: { username: `mgr_${RUN}`, password: 'Manager-pass-123' } })).data.accessToken;
    assert.ok(K && M);
  });

  test('STAFF-04 KITCHEN is not offered on the POS PIN screen', async () => {
    const staff = (await call('GET', '/auth/staff')).data;
    assert.ok(!staff.some((s) => s.role === 'KITCHEN'));
  });

  test('STAFF-05 audit + login history record staff actions without secrets', async () => {
    const audit = (await call('GET', '/users/audit?action=STAFF_CREATE&take=5', { token: A })).data;
    assert.ok(audit.items.some((a) => a.details.username === `chef_${RUN}`));
    assert.ok(!JSON.stringify(audit).includes('Kitchen-pass-123'));
    const logins = (await call('GET', '/users/logins?take=20', { token: A })).data;
    assert.ok(logins.some((l) => l.action === 'AUTH_LOGIN_PASSWORD'));
  });

  test('STAFF-06 cannot deactivate yourself; deactivated user cannot log in', async () => {
    const me = (await call('GET', '/auth/me', { token: A })).data;
    assert.equal((await call('PATCH', `/users/${me.id}`, { token: A, body: { isActive: false } })).status, 400);
    const tmp = await call('POST', '/users', { token: A, body: { name: 'Tmp', username: `tmp_${RUN}`, role: 'CASHIER', pin: '6158' } });
    created.push(tmp.data.id);
    assert.equal((await call('PATCH', `/users/${tmp.data.id}`, { token: A, body: { isActive: false } })).status, 200);
    const r = await call('POST', '/auth/pin-login', { body: { userIdentifier: tmp.data.id, pin: '6158' } });
    assert.equal(r.status, 401);
  });
});

describe('Role enforcement', () => {
  test('ROLE-01 KITCHEN: KDS allowed; menu writes, orders, payments, reports forbidden', async () => {
    assert.equal((await call('GET', '/orders/kitchen/tickets', { token: K })).status, 200);
    assert.equal((await call('GET', '/orders', { token: K })).status, 403);
    assert.equal((await call('POST', '/orders', { token: K, body: { type: 'TAKEAWAY' } })).status, 403);
    assert.equal((await call('GET', '/reports/summary', { token: K })).status, 403);
    assert.equal((await call('GET', '/settings', { token: K })).status, 403);
  });

  test('ROLE-02 MANAGER: reports + cashier ops + approval; no staff/settings admin', async () => {
    assert.equal((await call('GET', '/reports/summary', { token: M })).status, 200);
    assert.equal((await call('GET', '/orders', { token: M })).status, 200);
    assert.equal((await call('GET', '/users', { token: M })).status, 403);
    assert.equal((await call('PATCH', '/settings', { token: M, body: { RESTAURANT_NAME: 'x' } })).status, 403);
    const items = (await call('GET', '/menu-items', { token: M })).data;
    assert.ok('costPrice' in items[0], 'menejer tannarxni ko\'rishi kerak');
  });

  test('ROLE-03 cashier cannot see reports or audit', async () => {
    assert.equal((await call('GET', '/reports/summary', { token: C })).status, 403);
    assert.equal((await call('GET', '/users/audit', { token: C })).status, 403);
  });

  test('ROLE-04 socket: kitchen gets no order totals; cashier gets none of sync:status', async () => {
    const connect = (token) =>
      new Promise((resolve, reject) => {
        const s = io(API, { auth: { token }, transports: ['websocket'], reconnection: false });
        sockets.push(s);
        const ev = [];
        s.onAny((name, payload) => ev.push({ name, payload }));
        s.on('connect', () => setTimeout(() => resolve(ev), 150));
        s.on('connect_error', reject);
      });
    const kEv = await connect(K);
    const cEv = await connect(C);
    const menu = (await call('GET', '/menu-items', { token: C })).data.find((m) => m.isAvailable);
    const o = await call('POST', '/orders', { token: C, body: { type: 'TAKEAWAY', items: [{ menuItemId: menu.id, quantity: 1 }] } });
    await call('POST', `/orders/${o.data.id}/send-kitchen`, { token: C });
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(kEv.some((e) => e.name === 'kitchen:new-ticket'), 'oshxona chiptani olmadi');
    const kOrder = kEv.find((e) => e.name === 'order:updated');
    assert.ok(kOrder && !('total' in kOrder.payload), 'oshxonaga summa yuborilmasligi kerak');
    assert.ok(!kEv.some((e) => e.name === 'order:created'));
    const cOrder = cEv.find((e) => e.name === 'order:created');
    assert.ok(cOrder && !JSON.stringify(cOrder.payload).includes('costPrice'), 'hodisada tannarx bor');
    assert.ok(!cEv.some((e) => e.name === 'sync:status'));
    await call('POST', `/orders/${o.data.id}/cancel`, { token: A, body: { reason: 'test cleanup' } });
  });
});

describe('Reports', () => {
  test('REP-01 summary totals are consistent with paid orders', async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const r = await call('GET', `/reports/summary?from=${from.toISOString()}&to=${new Date(Date.now() + 60000).toISOString()}`, { token: A });
    assert.equal(r.status, 200, msg(r));
    const s = r.data;
    const paidOrders = (await call('GET', `/orders?status=PAID&from=${from.toISOString()}&take=200`, { token: A })).data;
    assert.equal(s.ordersCount, paidOrders.total);
    assert.equal(s.revenue, paidOrders.items.reduce((a, o) => a + o.total, 0));
    const payTotal = s.payments.reduce((a, p) => a + p.amount, 0);
    assert.equal(payTotal, s.revenue, 'to\'lovlar yig\'indisi tushumga teng emas');
    assert.equal(s.subtotal - s.discounts + s.serviceFees, s.revenue);
    assert.ok(Array.isArray(s.topProducts) && Array.isArray(s.hourly) && s.hourly.length === 24);
    assert.ok(s.refunds.count >= 1, 'bugungi qaytarilgan buyurtma ko\'rinmadi');
  });

  test('REP-02 invalid range → 400', async () => {
    assert.equal((await call('GET', '/reports/summary?from=2026-01-02&to=2026-01-01', { token: A })).status, 400);
    assert.equal((await call('GET', '/reports/summary?from=abc', { token: A })).status, 400);
  });
});
