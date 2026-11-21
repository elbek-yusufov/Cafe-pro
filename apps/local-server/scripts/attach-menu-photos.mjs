/**
 * Seed menyusidagi taomlarga rasm biriktirish (DEV yordamchi skript).
 *
 * Rasmlar — POS ning tasdiqlangan dizaynida (apps/pos-desktop/src/components/common/DishImage.tsx)
 * ishlatilgan Unsplash fotolari. Har biri yuklab olinadi, lokal serverning
 * POST /uploads/menu-image endpointi orqali saqlanadi (magic-byte tekshiruvi bilan)
 * va faqat RASMI YO'Q taomlarga biriktiriladi — admin qo'ygan rasm hech qachon almashtirilmaydi.
 *
 * Ishga tushirish (lokal server ishlab turgan bo'lishi kerak):
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=... node scripts/attach-menu-photos.mjs
 *   (DEV seed qiymatlari default sifatida ishlatiladi; production'da ishlatmang)
 *
 * Mos rasm topilmagan taomlar o'zgartirilmaydi (noto'g'ri rasm qo'yilmaydi).
 */

const API = process.env.API_URL || 'http://localhost:4000';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const PHOTO = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=500&q=80`;
const PHOTOS = {
  osh: PHOTO('photo-1633964913295-ceb43826e7c9'),
  shashlik: PHOTO('photo-1555939594-58d7cb561ad1'),
  qozon_kabob: PHOTO('photo-1544025162-d76694265947'),
  lagmon: PHOTO('photo-1569718212165-3a8278d5f624'),
  manti: PHOTO('photo-1496116218417-1a781b1c416c'),
  soup: PHOTO('photo-1547592166-23ac45744acd'),
  somsa: PHOTO('photo-1601050690597-df0568f70950'),
  bread: PHOTO('photo-1509440159596-0249088772ff'),
  achichuk: PHOTO('photo-1540420773420-3366772f4999'),
  tea_pot: PHOTO('photo-1576092768241-dec231879fc3'),
  cherry_juice: PHOTO('photo-1513558161293-cdaf765ed2fd'),
};

/** Taom → rasm kaliti. Tartib muhim: birinchi mos qoida ishlatiladi. */
function photoKeyFor(item) {
  const n = item.name.toLowerCase();
  const cat = (item.category?.name || '').toLowerCase();
  if (cat.includes('birinchi')) return 'soup'; // barcha sho'rvalar
  if (/palov|oshi/.test(n)) return 'osh';
  if (/shashlik/.test(n)) return 'shashlik';
  if (/qozon kabob|jiz-biz|dimlama/.test(n)) return 'qozon_kabob';
  if (/lag'mon/.test(n)) return 'lagmon';
  if (/manti/.test(n)) return 'manti';
  if (/somsa/.test(n)) return 'somsa';
  if (/\bnon\b|patir/.test(n)) return 'bread';
  if (/achchiq-chuchuk|bahoriy/.test(n)) return 'achichuk';
  if (/choy/.test(n)) return 'tea_pot';
  if (/kompot/.test(n)) return 'cherry_juice';
  return null;
}

async function api(method, path, { token, body, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json?.message ?? json)}`);
  return json.data;
}

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`yuklab bo'lmadi (${res.status})`);
  const type = res.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp)/.test(type)) throw new Error(`kutilmagan tur: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 2 * 1024 * 1024) throw new Error('2 MB dan katta');
  return { buf, type };
}

async function main() {
  const { accessToken: token } = await api('POST', '/auth/login', { body: { username: USERNAME, password: PASSWORD } });
  const items = await api('GET', '/menu-items?includeInactive=true', { token });

  const plan = items
    .filter((i) => !i.imageUrl)
    .map((i) => ({ item: i, key: photoKeyFor(i) }));

  const uploaded = new Map(); // key → /uploads/menu/...
  let attached = 0;
  const skipped = [];

  for (const { item, key } of plan) {
    if (!key) {
      skipped.push(item.name);
      continue;
    }
    if (!uploaded.has(key)) {
      const { buf, type } = await download(PHOTOS[key]);
      const form = new FormData();
      form.append('file', new Blob([buf], { type }), `${key}.${type.split('/')[1]}`);
      const { url } = await api('POST', '/uploads/menu-image', { token, form });
      uploaded.set(key, url);
      console.log(`⬆️  ${key}: ${(buf.length / 1024).toFixed(0)} KB → ${url}`);
    }
    await api('PATCH', `/menu-items/${item.id}`, { token, body: { imageUrl: uploaded.get(key) } });
    attached++;
    console.log(`🖼️  ${item.name} ← ${key}`);
  }

  console.log(`\n✅ ${attached} ta taomga rasm biriktirildi (${uploaded.size} ta fayl yuklandi).`);
  if (skipped.length) console.log(`➖ Mos rasm yo'q, o'zgartirilmadi: ${skipped.join(', ')}`);
  const already = items.length - plan.length;
  if (already) console.log(`↩️  Allaqachon rasmi bor (tegilmadi): ${already} ta`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
