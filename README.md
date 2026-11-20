# 🍽️ OshxonaPOS — O'zbekiston Restoran va Oshxonalari Uchun Offline-First Kassa & Boshqaruv Tizimi

**OshxonaPOS** — O'zbekiston umumiy ovqatlanish korxonalari (choyxonalar, oshxonalar, milliy taomlar markazlari va restoranlar) uchun maxsus ishlab chiqilgan, **100% oflayn rejimda ishlovchi**, xavfsiz va tezkor POS (Point of Sale) ekotizimi.

Internet butunlay uzilib qolsa ham kassa, oshxona (KDS) va ofitsiantlar lokal tarmoq (LAN) orqali uzluksiz ishlayveradi. Internet paydo bo'lishi bilan barcha cheklar va hisobotlar avtomatik ravishda markaziy bulut (Cloud API) bilan sinxronlanadi.

---

## 🏛️ Monorepo Arxitekturasi (Turborepo + pnpm)

```
oshxona-pos/
├── apps/
│   ├── local-server/      # Restoran ichidagi lokal NestJS server (Auth, Buyurtmalar, Smenalar, Stock, Sync, WebSocket)
│   ├── admin-web/         # Boshqaruv Paneli, KDS Oshxona Ekrani va QR Menyu (Next.js 15 + TailwindCSS)
│   ├── pos-desktop/       # Kassir uchun sensorli (Touchscreen) POS terminal (Vite + React 19 + Electron)
│   └── cloud-api/         # Markaziy Bulut Serveri (Ko'p filialli tahlil va sinxronizatsiya)
├── packages/
│   ├── shared/            # Universal UUIDv7, Enums, Types, so'm valyuta va kalkulyator utilitlari
│   ├── db/                # Prisma ORM sxemasi va haqiqiy o'zbek taomlari bilan to'liq Seed bazasi
│   ├── printer/           # ESC/POS 58mm/80mm termal cheklar, X/Z-Hisobotlar va fiskal modul adapteri
│   └── sync/              # Oflayn Outbox navbati, eksponensial backoff va konfliktlarni hal qilish siyosati
└── docker/
    ├── docker-compose.local.yml   # Restoran ichida bir buyruq bilan ishga tushirish
    └── docker-compose.cloud.yml   # Markaziy bulut serverini ishga tushirish
```

---

## ✨ Tizimning Asosiy Imkoniyatlari

### 1. ⚡ 100% Oflayn va LAN Sinxronizatsiyasi
- **UUIDv7 kalitlari:** Har bir chek, to'lov va taom internet yo'qligida ham vaqt tamg'ali unikal UUIDv7 bilan yaratiladi. ID to'qnashuvi ehtimoli $0\%$.
- **Outbox Navbati (`SyncQueue`):** Barcha operatsiyalar mahalliy navbatga yoziladi.
- **Konfliktlarni hal qilish:** Moliyaviy tranzaksiyalar uchun **Append-Only** (qo'shib borish), menyu va narxlar uchun **Last-Write-Wins** siyosati.
- **Eksponensial Backoff:** Aloqa uzilganda server zo'riqmasligi uchun $1\text{s} \to 2\text{s} \to 4\text{s} \to \dots \to 60\text{s}$ oraliqda avtomatik qayta urinish.

### 2. 💰 Butun Sonli Valyuta (UZS Tiynsiz So'm)
- Moliya va narxlar suzuvchi nuqtali sonlarda (`float`/`double`) EMAS, qat'iy butun sonlarda (`integer`) saqlanadi.
- Matematik yaxlitlash xatolariga mutlaqo o'rin qolmaydi. Format: `1 250 000 so'm`.

### 3. 👥 Foydalanuvchilar va 4 Xonali Tezkor PIN-Login
- **1 Bosh Admin:** To'liq huquq, menyu narxlarini o'zgartirish, ombor, hisobotlar va buyurtmani bekor qilish.
- **2 Kassir:** Tezkor 4 xonali PIN-kod orqali sensorli kassa terminaliga 1 soniyada kirish.
- **Ofitsiantlar:** Stol buyurtmalarini qabul qilish va oshxonaga yuborish.

### 4. 🍽️ Oshxona va Stol Boshqaruvi
- Zallar (Asosiy zal, Yozgi ayvon, VIP xonalar) va stollar xaritasi.
- Buyurtmani boshqa stolga ko'chirish, hisobni bo'lish (Split bill), buyurtmalarni birlashtirish (Merge orders).
- Muzlatilgan narxlar: Buyurtmaga taom qo'shilgan paytdagi narx muzlatiladi (agar admin keyinroq menyu narxini oshirsa ham, joriy chekka ta'sir qilmaydi).

### 5. 🖨️ ESC/POS Termal Cheklar va X/Z-Hisobotlar
- 58mm va 80mm o'lchamdagi termoprinterlar uchun tayyor shablonlar:
  - **Mijoz cheki:** Restoran nomi, INN, chek raqami, taomlar, xizmat haqi, to'lov turi, QR kod.
  - **Oshxona buyurtma chiptasi (Kotel/Mangal):** Stol raqami, vaqti, porsiyalar soni va oshpazga eslatmalar.
  - **Qayta chop etish (Duplicate):** Agar chek qayta chiqarilsa, ustiga aniq qilib `*** NUSXA ***` tamg'asi bosiladi va audit logiga yoziladi.
  - **Fiskal modul tayyorgarligi:** Soliq qo'mitasi Online-KKM talablariga mos `FiscalModuleAdapter` interfeysi.

### 6. 💼 Smena Boshqaruvi (X-Report va Z-Report)
- Smena ochish: Boshlang'ich kassa naqdi kiritiladi.
- Kassa harakatlari: Naqd kiritish (Deposit), Inkassatsiya (Withdrawal), Xarajat (Expense).
- **X-Hisobot:** Smenani yopmasdan turib oraliq tushumni tekshirish.
- **Z-Hisobot:** Kun oxirida smenani yopish, kutilgan naqd va haqiqiy naqd pulni solishtirish, kassa tafovutini (kamomad/ortiqcha) chiqarish.

### 7. 🥩 Retseptlar va Avtomatik Chiqim (Kalkulyatsiya)
- Har bir taomga texnologik xarita (retsept) bog'lanadi (masalan: 1 porsiya Palov = 200g guruch + 150g go'sht + 200g sabzi).
- Chek to'langanda ingredientlar ombordan avtomatik tarzda `OUT_SALE` turi bilan chiqim qilinadi.
- Ombor qoldig'i belgilangan minimal me'yordan kamayganda zudlik bilan bildirishnoma beriladi.

### 8. 🍳 KDS Oshxona Ekrani (`/kds`)
- Oshpazlar uchun sensorli monitor: Buyurtmalar kelib tushishi bilan vizual va ovozli signal.
- Taymerlar: 10 daqiqagacha yashil, 10-15 daqiqa sariq, 15 daqiqadan oshganda qizil ogohlantirish.
- Bir teginishda taom holatini `Qozonda` $\to$ `Tayyor` $\to$ `Berildi` ga o'tkazish.

### 9. 📱 Mehmonlar Uchun QR Menyu (`/qr-menu`)
- Mehmon stol ustidagi QR kodni skaner qilib, o'z telefonida taomlar tarkibi va narxlarini ko'radi.
- **"🔔 Ofitsiant chaqirish"** va **"🧾 Hisob so'rash"** tugmalari to'g'ridan-to'g'ri kassir ekrani va Telegramga xabar beradi.

### 10. 🤖 Telegram Bot & Avtomatik Backup
- **Kunlik Z-Hisobot:** Smena yopilganda tushum, to'lov turlari va kassa tafovuti haqida xabar yuboriladi.
- **Kamomad/Ombor ogohlantirishi:** Masalliq tugab qolayotganda telegramga ogohlantirish.
- **Avtomatik Backup:** Smena yopilganda ma'lumotlar bazasining zaxira nusxasi olinadi va oxirgi 7 kunlik nusxa saqlab boriladi.

---

## 🔑 Standart Kirish Ma'lumotlari (Seed)

| Rol | Foydalanuvchi nomi | Parol | Kassa PIN-kodi | Chegirma limiti |
| :--- | :--- | :--- | :--- | :--- |
| **Bosh Admin** | `admin` | `admin123` | `0000` | 100% |
| **Kassir 1** | `kassir1` | `kassir123` | `1111` | 10% |
| **Kassir 2** | `kassir2` | `kassir222` | `2222` | 10% |

---

## 🚀 O'rnatish va Ishga Tushirish Yo'riqnomasi

### Talablar:
* **Node.js:** v20.10.0 yoki undan yuqori
* **pnpm:** v10.0.0+ (`npm install -g pnpm`)

### 1. Bog'liqliklarni o'rnatish
```bash
# Loyiha papkasiga kiring
cd oshxona-pos

# Barcha paketlarni o'rnatish
pnpm install
```

### 2. Ma'lumotlar Bazasini Yaratish va Boshlang'ich Ma'lumotlar bilan To'ldirish
```bash
# Prisma klientini generatsiya qilish
pnpm --filter @oshxona/db prisma generate

# Bazani yaratish (SQLite / PostgreSQL)
pnpm --filter @oshxona/db prisma db push

# 30 ta haqiqiy o'zbek taomlari, stollar va xodimlarni bazaga kiritish (Seed)
pnpm --filter @oshxona/db seed
```

### 3. Tizimni Ishga Tushirish

#### Variant A: Barcha xizmatlarni bittada ishga tushirish (Turborepo)
```bash
pnpm dev
```

#### Variant B: Xizmatlarni alohida terminallarda ishga tushirish

1. **Lokal Server (NestJS API — Port 3000):**
```bash
pnpm --filter @oshxona/local-server start:dev
# Swagger hujjatlari: http://localhost:3000/api/docs
```

2. **Admin Web Paneli, KDS va QR Menyu (Next.js — Port 3001):**
```bash
pnpm --filter @oshxona/admin-web dev
# Boshqaruv paneli: http://localhost:3001
# KDS Oshxona ekrani: http://localhost:3001/kds
# QR Menyu (Mehmonlar): http://localhost:3001/qr-menu?table=T-1
```

3. **Kassa Sensorli Terminali (Desktop POS — Port 5173):**
```bash
pnpm --filter @oshxona/pos-desktop dev
```

4. **Markaziy Bulut Serveri (Cloud API — Port 4000):**
```bash
pnpm --filter @oshxona/cloud-api start:dev
```

---

## 🐳 Docker Orqali Ishga Tushirish

Restoranda server kompyuteriga bir buyruq bilan to'liq ekotizimni ko'tarish:

```bash
# Mahalliy server, PostgreSQL va Admin Webni ishga tushirish
docker compose -f docker/docker-compose.local.yml up -d --build
```

Markaziy bulut serverini ishga tushirish:
```bash
docker compose -f docker/docker-compose.cloud.yml up -d --build
```

---

## ⚙️ Sozlamalar (`.env`)

Lokal server sozlamalari (`apps/local-server/.env`):
```env
PORT=3000
DATABASE_URL="file:./data/oshxona.db"
JWT_SECRET="oshxona-pos-offline-super-secret-key-2026"
JWT_EXPIRES_IN="7d"

# Bulut sinxronizatsiyasi
CLOUD_SYNC_URL="http://localhost:4000/sync"
BRANCH_ID="branch-tashkent-main"

# Telegram Bot (Ixtiyoriy)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
TELEGRAM_CHAT_ID="-100123456789"
```

---

## 🛡️ Ishlab Chiqarish Sifati va Tekshiruv

Loyiha to'liq TypeScript tip xavfsizligida qurilgan:
```bash
# Barcha 9 ta paket va ilovalarni to'liq kompiyatsiya qilish
pnpm build
```
Natija: **Barcha paketlar 0 ta xatolik bilan muvaffaqiyatli yig'iladi.**

---

**Muallif:** OshxonaPOS Jamoasi  
**Litsenziya:** Xususiy Mulk (Proprietary) — O'zbekiston umumiy ovqatlanish bozori uchun maxsus.
