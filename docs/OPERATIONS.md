# OshxonaPOS — ishga tushirish va ekspluatatsiya

## Arxitektura (qisqa)

```
[POS kassa: Windows ilova / brauzer] ─┐
[KDS ekran / Admin panel: brauzer]  ──┼── LAN ──► [Lokal server (NestJS) :4000] ──► [PostgreSQL]
[Ofitsiant planshet]                ──┘                     │  outbox (sync_queue)
                                                            └── internet (ixtiyoriy) ──► [cloud-api]
```

- Barcha buyurtma, to'lov, chek va ombor harakatlari **lokal serverdagi PostgreSQL** ga yoziladi. Internet shart emas.
- Kassalar serverga **LAN** orqali ulanadi (server `0.0.0.0:4000` da tinglaydi va ishga tushganda LAN IP manzilini chiqaradi).
- Real-vaqt: Socket.IO (JWT bilan, rol xonalari bo'yicha).

## Ishga tushirish (development)

```bash
pnpm install
cp .env.example .env            # JWT kalitlari: openssl rand -hex 48 (ikkalasi har xil)
ln -s ../../.env apps/local-server/.env && ln -s ../../.env packages/db/.env
pnpm --filter @oshxona/db exec prisma migrate deploy
pnpm --filter @oshxona/shared --filter @oshxona/db --filter @oshxona/sync --filter @oshxona/printer build
pnpm --filter @oshxona/local-server build && (cd apps/local-server && node dist/main.js)   # :4000
pnpm --filter @oshxona/pos-desktop dev     # POS  :5173
pnpm --filter @oshxona/admin-web dev       # Admin/KDS :3000
```

Seed (`packages/db/prisma/seed.ts`) **bo'sh** bazada ishlaydi; ma'lumot bo'lsa rad etadi (`SEED_ALLOW_RESET=true` faqat backup olingan DEV bazada).
Seed PIN/parollari faqat sinov uchun — production'da server ularni aniqlasa **ishga tushmaydi**.

## Rollar

| Rol | Kirish | Huquq |
|---|---|---|
| OWNER | parol | hammasi (OWNER rolini faqat OWNER beradi) |
| ADMIN | parol (+PIN) | hammasi: xodimlar, sozlamalar, menyu, hisobot |
| MANAGER | parol (+PIN) | kassa + tasdiqlash (bekor/qaytarish/chegirma) + hisobot, menyu, ombor; xodim/sozlama yo'q |
| CASHIER | PIN (kassa) | buyurtma, to'lov, chegirma o'z limitida; tannarx ko'rinmaydi |
| WAITER | PIN | buyurtma, stol |
| KITCHEN | parol (`/kds`) | faqat oshxona ekrani (narxlarsiz) |

Ruxsat har bir endpoint va Socket.IO hodisasida **serverda** tekshiriladi.

## Kassa ish jarayoni

1. Xodim tanlanadi → PIN (5 xato urinish → 5 daqiqa blok).
2. Taomlar savatga → to'lov tugmasi: buyurtma serverda yaratiladi (narx/summa **serverda**), oshxonaga yuboriladi,
   to'lov oynasi **server summasi** bilan ochiladi. Oynani yopish = "oshxonaga yuborildi, to'lov keyin".
3. Band stolni tanlab, savat bo'sh holda to'lov tugmasi → stol hisobi to'lanadi.
4. Chegirma kassir limitidan oshsa — admin/menejer PIN oynasi.
5. Takroriy bosish/qayta yuborish: buyurtma IDsi (UUID) va atomik holat o'tishi — ikkinchi buyurtma/to'lov yaratilmaydi.

## Oflayn / LAN xatti-harakati (sinovdan o'tgan)

| Holat | Natija |
|---|---|
| Internet yo'q, lokal server bor | To'liq ishlaydi. Bulut sinxroni navbatda kutadi, qayta urinadi. |
| Lokal server vaqtincha yo'q | POS sarlavhasida "Oflayn". Yangi savat **shu qurilmada** saqlanadi (to'lov bilan yoki to'lovsiz), server qaytgach **avtomatik** yuboriladi (≈10 s). Takroriy yaratilmaydi. |
| Server qaytgach summa farq qilsa | Buyurtma yaratiladi, to'lov **yozilmaydi**, yozuv "xato" holatida qoladi — kassir qayta to'lov qabul qiladi. Hech narsa jimgina o'chirilmaydi. |
| Oflaynda ishlamaydi | stolning mavjud hisobiga qo'shish, hisobot, KDS (server kerak), menyu yangilanishi |

## Windows kassa ilovasi (Electron)

```bash
cd apps/pos-desktop
pnpm dist:win        # → release/OshxonaPOS-Kassa-Setup-<versiya>.exe (NSIS, x64)
```

- Kamida ~1 GB bo'sh disk kerak (o'ralmagan ilova ~270 MB + o'rnatuvchi ~80 MB).
- O'rnatilgandan keyin sozlama: `%APPDATA%\OshxonaPOS Kassa\pos-config.json`
  (`apiUrl` — server LAN manzili, `deviceId`, `fullscreen` — kiosk rejim, `printerName`). Manzilni PIN ekranidan ham o'zgartirish mumkin.
- Lokal server `.env` da `CORS_ORIGINS` ga `oshxona://pos` qo'shilgan bo'lishi kerak.
- Refresh token Windows DPAPI (safeStorage) bilan shifrlanadi.
- Chek: tizimdagi printer drayveri orqali jim chop etish (58/80 mm). To'g'ridan-to'g'ri ESC/POS (raw USB/LAN) hali yo'q.

## Ma'lum cheklovlar

- Kod imzolanmagan (code signing sertifikati yo'q) — Windows SmartScreen ogohlantiradi.
- Bank terminali integratsiyasi yo'q: karta/Click to'lovlari qo'lda qayd etiladi.
- Soliq (QQS) hisobi alohida qator sifatida yo'q (narxlar QQS bilan deb hisoblanadi); xizmat haqi bor.
- Hisobotlar buyurtma **yaratilgan** vaqt bo'yicha va server mintaqasida hisoblanadi.
- Brauzer versiyasida access/refresh token localStorage da (XSS xavfi) — Windows ilovasida refresh token shifrlangan.
