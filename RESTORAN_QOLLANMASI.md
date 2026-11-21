# 🍽️ OshxonaPOS — Restoran Kassa va Boshqaruv Tizimi
## Mijoz va Restoran Xodimlari Uchun To‘liq Foydalanish Qo‘llanmasi

Ushbu hujjat **OshxonaPOS** tizimini restoranga o‘rnatish, ishga tushirish, kassa va boshqaruv paneli bilan kunlik ishlash bo‘yicha to‘liq yo‘riqnomadir.

---

## 🚀 1. TIZIMNI ISHGA TUSHIRISH (1-KLIK)

Kassa kompyuterida dasturni ishga tushirish uchun:
1. Ish stolida (Desktop) joylashgan **`start-pos.bat`** faylini ikki marta bosing.
2. Skript avtomatik ravishda:
   - PostgreSQL ma'lumotlar bazasini tekshiradi;
   - Mahalliy server (Port 4000) va Kassa tizimini (Port 5173) ishga tushiradi;
   - Sensorli kassa ekranini brauzerda to‘liq hajmda ochadi.
3. Kassa ekrani ochilgach, kassir o‘zining **PIN-kodini** (standart: `1234`) terib tizimga kiradi.

---

## 👨‍🍳 2. KASSIR UCHUN QO‘LLANMA (KASSA EKRANI)

**Asosiy manzil:** `http://localhost:5173`

### A. Buyurtma Olish:
1. Chap tomondagi menyudan kategoriyani tanlang (Milliy taomlar, Shashliklar, Ichimliklar va h.k.).
2. Kerakli taomni bosing — u o‘rtadagi savatga (Cart) qo‘shiladi.
3. Miqdorni oshirish/kamaytirish uchun `+` va `-` tugmalaridan foydalaning.
4. Agar taom maxsus talab bilan tayyorlansa (masalan: *"kam yog'li"*, *"piyozsiz"*), taom ustiga bosib izoh qoldiring.

### B. Stolni Tanlash va Band Qilish:
- Yuqori qismdagi **"Stol tanlash"** tugmasini bosing va mijoz o‘tirgan stolni belgilang (masalan: *Stol 4*).
- Agar mijoz taomni olib ketmoqchi bo‘lsa, **"Olib ketish (Takeaway)"** tugmasini yoqing.

### C. To‘lovni Qabul Qilish:
1. O‘ng tomondagi **"To‘lov"** tugmasini bosing.
2. To‘lov turini tanlang:
   - 💵 **Naqd pul (CASH):** Mijoz bergan summani tezkor tugmalar (50 000, 100 000, 200 000) orqali kiriting — tizim qaytimni avtomatik hisoblaydi.
   - 💳 **Karta (Uzcard / Humo / Visa):** Bank terminali orqali to‘lov olingach, "Tasdiqlash" tugmasini bosing.
   - 📱 **QR (Click / Payme):** Ekranda chiqqan QR-kod orqali mijoz to‘lov qilgach tasdiqlang.
3. **"To‘lovni Yakunlash"** tugmasini bosing — chek avtomatik chiqariladi va stol bo‘shaydi.

---

## 👔 3. ADMIN VA MENEJER UCHUN QO‘LLANMA (BOSHQARUV PANELI)

**Asosiy manzil:** `http://localhost:3000/menu`

### A. Yangi Taom Qo‘shish:
1. Admin panelga kiring va **"+ Yangi Taom Qo'shish"** tugmasini bosing.
2. Formada:
   - **Nomi:** Taomning to‘liq nomi.
   - **Kategoriya:** Mos guruhni tanlang.
   - **Rasm:** Kompyuterdan rasm yuklang (JPEG, PNG yoki WebP, 5MB gacha).
   - **Sotuv narxi va Tannarx:** Kiritilgan zahoti tizim marja va kutilayotgan sof foydani avtomatik hisoblaydi.
   - **Ombor qoldig'i:** Ombordagi mavjud miqdor va ogohlantirish chegarasini belgilang.
3. **"Saqlash"** tugmasini bosing — yangi taom o‘sha soniyaning o‘zidayoq kassir ekranida paydo bo‘ladi!

### B. Taom Narxini O‘zgartirish:
1. Har bir taom qatoridagi **`$` (Dollar)** belgisini bosing.
2. Yangi narxni va o‘zgartirish sababini (masalan: *"Go'sht qimmatlashgani sababli"*) kiriting.
3. Saqlang — tizim narx o‘zgarishini Audit Log tarixiga saqlaydi va kassaga bir zumda uzatadi.

### C. Taomni Stop-Listga Olish ("Tugadi" belgisi):
- Agar oshxonada biror masalliq tugasa, jadvaldagi **"Sotuvda"** tugmasini 1 marta bosish kifoya — u **"Stop-List"**ga aylanadi va kassir uni tasodifan sotib yuborishining oldi olinadi.

---

## ⚡ 4. FAVQULODDA VAZIYATLAR VA STABILLIK KAFOLATI

### 1. Internet Butunlay O‘chib Qolsa:
- **Hech narsa qilish shart emas!** Kassa tizimi 100% oflayn rejimda ishlashda davom etadi.
- Barcha buyurtmalar, to‘lovlar va cheklar mahalliy xotiraga saqlanib boradi.
- Internet yonganda ma'lumotlar avtomatik sinxronlashadi.

### 2. Kassa Kompyuteri To‘satdan O‘chib Qolsa:
- Kompyuterni yoqing va `start-pos.bat` faylini bosing.
- Oxirgi saqlangan buyurtmalar va stollar holati buzilmasdan qayta tiklanadi.

### 3. Printerda Qog‘oz Tugasa:
- Yangi qog‘oz lentasini soling va oxirgi chekni kassa ekranidagi **"Chekni qayta chiqarish"** tugmasi orqali chop eting. Tizim qotib qolmaydi.

---

## 📞 TEXNIK QO‘LLAB-QUVVATLASH
Savollar yoki qo‘shimcha integratsiyalar bo‘yicha texnik guruh bilan bog‘laning.
* **Tizim versiyasi:** v1.0.0 (Production Stable)
* **Baza:** PostgreSQL 18
* **Lokal Portlar:** Kassa (5173), Admin (3000), Server (4000)
