import { PrismaClient, Role, DeviceType, UnitType, TableStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateUUIDv7 } from '@oshxona/shared';

const prisma = new PrismaClient();

/**
 * Xavfsizlik tekshiruvi: seed barcha jadvallarni tozalaydi (deleteMany).
 * - Production muhitida hech qachon ishlamaydi.
 * - Bazada allaqachon ma'lumot bo'lsa, faqat SEED_ALLOW_RESET=true bilan ishlaydi.
 */
async function assertSafeToSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed production muhitida taqiqlangan (NODE_ENV=production).');
  }

  const [users, orders, payments, menuItems] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.payment.count(),
    prisma.menuItem.count(),
  ]);
  const hasData = users + orders + payments + menuItems > 0;

  if (hasData && process.env.SEED_ALLOW_RESET !== 'true') {
    throw new Error(
      `Bazada ma'lumot mavjud (users=${users}, orders=${orders}, payments=${payments}, menuItems=${menuItems}). ` +
        'Seed barcha jadvallarni o\'chiradi. Davom etish uchun avval backup oling va SEED_ALLOW_RESET=true bilan qayta ishga tushiring.',
    );
  }
}

async function main() {
  await assertSafeToSeed();

  console.log('🌱 OshxonaPOS ma\'lumotlar bazasini tozalash va to\'ldirish (Seeding)...');

  // Tozalash (teskari tartibda)
  await prisma.syncQueue.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.table.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.debtTransaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.printer.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.branch.deleteMany();

  // 1. Filial (Branch)
  const branchId = generateUUIDv7();
  await prisma.branch.create({
    data: {
      id: branchId,
      name: 'Bosh Filial — Samarqand',
      address: 'Samarqand sh., Registon ko\'chasi 1',
      phone: '+998 66 233 44 55',
      isActive: true
    }
  });

  // 2. Foydalanuvchilar (1 Admin, 2 Kassir)
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', passwordSalt);
  const adminPinHash = await bcrypt.hash('0000', passwordSalt);
  const cashier1PinHash = await bcrypt.hash('1111', passwordSalt);
  const cashier2PinHash = await bcrypt.hash('2222', passwordSalt);

  const adminUser = await prisma.user.create({
    data: {
      id: generateUUIDv7(),
      name: 'Akmal Rahimov (Menejer)',
      username: 'admin',
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
      pinHash: adminPinHash,
      discountLimit: 100,
      isActive: true,
      branchId
    }
  });

  const cashier1 = await prisma.user.create({
    data: {
      id: generateUUIDv7(),
      name: 'Dilshod Karimov',
      username: 'kassir1',
      role: Role.CASHIER,
      pinHash: cashier1PinHash,
      discountLimit: 10,
      isActive: true,
      branchId
    }
  });

  const cashier2 = await prisma.user.create({
    data: {
      id: generateUUIDv7(),
      name: 'Madina Umarova',
      username: 'kassir2',
      role: Role.CASHIER,
      pinHash: cashier2PinHash,
      discountLimit: 10,
      isActive: true,
      branchId
    }
  });

  console.log(`✅ Foydalanuvchilar yaratildi: 1 Admin (${adminUser.username}), 2 Kassir (${cashier1.username}, ${cashier2.username})`);

  // 3. Qurilmalar (Devices)
  await prisma.device.createMany({
    data: [
      {
        id: 'kassa-pos-01',
        name: 'Asosiy Kassa #1 (Front)',
        type: DeviceType.POS_CASHIER,
        branchId,
        isActive: true
      },
      {
        id: 'kassa-pos-02',
        name: 'Ikkinchi Kassa #2 (Bar/Ayvon)',
        type: DeviceType.POS_CASHIER,
        branchId,
        isActive: true
      },
      {
        id: 'kds-kitchen-01',
        name: 'Oshxona KDS Ekran',
        type: DeviceType.KDS_KITCHEN,
        branchId,
        isActive: true
      }
    ]
  });

  // 4. Sozlamalar (Settings)
  await prisma.setting.createMany({
    data: [
      { id: generateUUIDv7(), key: 'RESTAURANT_NAME', value: 'Rayhon Milliy Taomlar', description: 'Restoran nomi chekda' },
      { id: generateUUIDv7(), key: 'RESTAURANT_ADDRESS', value: 'Samarqand sh., Registon ko\'chasi 1', description: 'Manzil' },
      { id: generateUUIDv7(), key: 'RESTAURANT_PHONE', value: '+998 90 123 45 67', description: 'Aloqa telefoni' },
      { id: generateUUIDv7(), key: 'SERVICE_FEE_PERCENT', value: '10', description: 'Zal uchun xizmat haqi foizi' },
      { id: generateUUIDv7(), key: 'CURRENCY', value: 'UZS', description: 'Valyuta' },
      { id: generateUUIDv7(), key: 'RECEIPT_HEADER_NOTE', value: 'Xush kelibsiz!', description: 'Chek yuqorisidagi yozuv' },
      { id: generateUUIDv7(), key: 'RECEIPT_FOOTER_NOTE', value: 'Xaridingiz uchun rahmat! Osh bo\'lsin!', description: 'Chek ostidagi yozuv' }
    ]
  });

  // 5. Zallar va Stollar
  const hallMainId = generateUUIDv7();
  const hallTerraceId = generateUUIDv7();
  const hallVipId = generateUUIDv7();

  await prisma.hall.createMany({
    data: [
      { id: hallMainId, name: 'Asosiy zal', branchId, sortOrder: 1 },
      { id: hallTerraceId, name: 'Ayvon (Terasa)', branchId, sortOrder: 2 },
      { id: hallVipId, name: 'VIP Xonalar', branchId, sortOrder: 3 }
    ]
  });

  // Stollar
  const tablesData = [
    { id: generateUUIDv7(), hallId: hallMainId, name: 'Stol 1', capacity: 4, status: TableStatus.AVAILABLE, posX: 1, posY: 1 },
    { id: generateUUIDv7(), hallId: hallMainId, name: 'Stol 2', capacity: 4, status: TableStatus.AVAILABLE, posX: 1, posY: 2 },
    { id: generateUUIDv7(), hallId: hallMainId, name: 'Stol 3', capacity: 6, status: TableStatus.AVAILABLE, posX: 2, posY: 1 },
    { id: generateUUIDv7(), hallId: hallMainId, name: 'Stol 4', capacity: 6, status: TableStatus.AVAILABLE, posX: 2, posY: 2 },
    { id: generateUUIDv7(), hallId: hallMainId, name: 'Stol 5', capacity: 8, status: TableStatus.AVAILABLE, posX: 3, posY: 1 },
    { id: generateUUIDv7(), hallId: hallTerraceId, name: 'Ayvon 1', capacity: 4, status: TableStatus.AVAILABLE, posX: 1, posY: 1 },
    { id: generateUUIDv7(), hallId: hallTerraceId, name: 'Ayvon 2', capacity: 4, status: TableStatus.AVAILABLE, posX: 1, posY: 2 },
    { id: generateUUIDv7(), hallId: hallTerraceId, name: 'Ayvon 3', capacity: 6, status: TableStatus.AVAILABLE, posX: 2, posY: 1 },
    { id: generateUUIDv7(), hallId: hallTerraceId, name: 'Ayvon 4', capacity: 6, status: TableStatus.AVAILABLE, posX: 2, posY: 2 },
    { id: generateUUIDv7(), hallId: hallVipId, name: 'VIP 1 (Buxoro)', capacity: 10, status: TableStatus.AVAILABLE, posX: 1, posY: 1 },
    { id: generateUUIDv7(), hallId: hallVipId, name: 'VIP 2 (Samarqand)', capacity: 12, status: TableStatus.AVAILABLE, posX: 2, posY: 1 },
    { id: generateUUIDv7(), hallId: hallVipId, name: 'VIP 3 (Xiva)', capacity: 8, status: TableStatus.AVAILABLE, posX: 3, posY: 1 }
  ];
  await prisma.table.createMany({ data: tablesData });

  // 6. Xomashyo (Ingredients) va Yetkazib beruvchi (Supplier)
  const supplierId = generateUUIDv7();
  await prisma.supplier.create({
    data: {
      id: supplierId,
      name: 'Samarqand Oziq-Ovqat Ulgurji Bazasi',
      phone: '+998 91 555 44 33',
      address: 'Samarqand, Siyob bozori 45'
    }
  });

  const ingRice = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Devzira / Lazer guruch', unit: UnitType.KG, currentQty: 100, minQty: 20, avgCost: 22000 }
  });
  const ingBeef = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Mol go\'shti (lahm)', unit: UnitType.KG, currentQty: 80, minQty: 15, avgCost: 85000 }
  });
  const ingLamb = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Qo\'y go\'shti va dumba', unit: UnitType.KG, currentQty: 60, minQty: 10, avgCost: 95000 }
  });
  const ingCarrot = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Sariq va qizil sabzi', unit: UnitType.KG, currentQty: 120, minQty: 25, avgCost: 4000 }
  });
  const ingOnion = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Piyoz', unit: UnitType.KG, currentQty: 100, minQty: 20, avgCost: 3000 }
  });
  const ingOil = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Paxta va zig\'ir yog\'i', unit: UnitType.LITRE, currentQty: 50, minQty: 10, avgCost: 19000 }
  });
  const ingFlour = await prisma.ingredient.create({
    data: { id: generateUUIDv7(), name: 'Oliy navli un', unit: UnitType.KG, currentQty: 150, minQty: 30, avgCost: 7000 }
  });

  // 7. 6 ta Kategoriyalar
  const cat1 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Birinchi taomlar', nameRu: 'Первые блюда', color: '#EA580C', sortOrder: 1 }
  });
  const cat2 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Ikkinchi taomlar', nameRu: 'Вторые блюда', color: '#D97706', sortOrder: 2 }
  });
  const cat3 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Shashlik va kaboblar', nameRu: 'Шашлыки и кебабы', color: '#DC2626', sortOrder: 3 }
  });
  const cat4 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Salatlar va gazaklar', nameRu: 'Салаты и закуски', color: '#16A34A', sortOrder: 4 }
  });
  const cat5 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Non va pishiriqlar', nameRu: 'Хлеб и выпечка', color: '#CA8A04', sortOrder: 5 }
  });
  const cat6 = await prisma.category.create({
    data: { id: generateUUIDv7(), name: 'Ichimliklar va choy', nameRu: 'Напитки и чай', color: '#0284C7', sortOrder: 6 }
  });

  console.log('✅ 6 ta kategoriya yaratildi.');

  // 8. 30 ta O'zbek taomi
  const dishes = [
    // Birinchi taomlar
    { name: 'Ko\'za sho\'rva', nameRu: 'Шурпа в горшочке', price: 32000, cost: 18000, catId: cat1.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Mastava', nameRu: 'Мастава', price: 28000, cost: 15000, catId: cat1.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Chuchvara sho\'rva', nameRu: 'Чучвара с бульоном', price: 30000, cost: 16000, catId: cat1.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Mampar', nameRu: 'Мампар', price: 29000, cost: 15500, catId: cat1.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'No\'xat sho\'rva', nameRu: 'Шурпа с горохом', price: 33000, cost: 17000, catId: cat1.id, unit: UnitType.PORTION, station: 'Issiq sex' },

    // Ikkinchi taomlar
    { name: 'Choyxona palov (Osh)', nameRu: 'Чайханский плов', price: 35000, cost: 20000, catId: cat2.id, unit: UnitType.PORTION, station: 'Oshxona sex', isFeatured: true },
    { name: 'To\'y oshi (maxsus)', nameRu: 'Праздничный плов', price: 38000, cost: 22000, catId: cat2.id, unit: UnitType.PORTION, station: 'Oshxona sex', isFeatured: true },
    { name: 'Qovurma lag\'mon', nameRu: 'Жареный лагман', price: 34000, cost: 19000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Cho\'zma lag\'mon (sho\'rvali)', nameRu: 'Тянутый лагман', price: 34000, cost: 19000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Qozon kabob (mol go\'shti)', nameRu: 'Казан-кебаб из говядины', price: 55000, cost: 32000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex', isFeatured: true },
    { name: 'Manti (mol go\'shti)', nameRu: 'Манты с говядиной', price: 35000, cost: 19000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Manti (qovoqli)', nameRu: 'Манты с тыквой', price: 25000, cost: 11000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Dimlama', nameRu: 'Дымляма', price: 42000, cost: 24000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },
    { name: 'Norin (ot go\'shti bilan)', nameRu: 'Нарын с кониной', price: 45000, cost: 26000, catId: cat2.id, unit: UnitType.PORTION, station: 'Salat sex' },
    { name: 'Jiz-biz (qo\'y go\'shti)', nameRu: 'Жиз-быз баранина', price: 58000, cost: 34000, catId: cat2.id, unit: UnitType.PORTION, station: 'Issiq sex' },

    // Shashlik va kaboblar
    { name: 'Qiyma shashlik', nameRu: 'Шашлык молотый (люля)', price: 16000, cost: 9000, catId: cat3.id, unit: UnitType.PIECE, station: 'Mangal sex' },
    { name: 'Go\'shtli shashlik (kuskovoy)', nameRu: 'Шашлык кусковой из говядины', price: 19000, cost: 11000, catId: cat3.id, unit: UnitType.PIECE, station: 'Mangal sex', isFeatured: true },
    { name: 'Jigar shashlik (dumbasi bilan)', nameRu: 'Шашлык из печени с курдюком', price: 15000, cost: 8000, catId: cat3.id, unit: UnitType.PIECE, station: 'Mangal sex' },
    { name: 'Tovuq shashlik', nameRu: 'Шашлык из курицы', price: 15000, cost: 7500, catId: cat3.id, unit: UnitType.PIECE, station: 'Mangal sex' },
    { name: 'Rulet shashlik', nameRu: 'Шашлык рулет', price: 21000, cost: 12000, catId: cat3.id, unit: UnitType.PIECE, station: 'Mangal sex' },

    // Salatlar va gazaklar
    { name: 'Achchiq-chuchuk (Shakarob)', nameRu: 'Ачик-чучук', price: 10000, cost: 4000, catId: cat4.id, unit: UnitType.PORTION, station: 'Salat sex' },
    { name: 'Bahoriy salat', nameRu: 'Весенний салат', price: 12000, cost: 5000, catId: cat4.id, unit: UnitType.PORTION, station: 'Salat sex' },
    { name: 'Suzma (chakka ko\'katli)', nameRu: 'Сузьма с зеленью', price: 8000, cost: 3000, catId: cat4.id, unit: UnitType.PORTION, station: 'Salat sex' },
    { name: 'Oliviye salati', nameRu: 'Салат Оливье', price: 18000, cost: 9000, catId: cat4.id, unit: UnitType.PORTION, station: 'Salat sex' },
    { name: 'Fransuzcha salat', nameRu: 'Французский салат', price: 20000, cost: 10000, catId: cat4.id, unit: UnitType.PORTION, station: 'Salat sex' },

    // Non va pishiriqlar
    { name: 'Tandir somsa (go\'shtli)', nameRu: 'Тандырная самса с мясом', price: 12000, cost: 6500, catId: cat5.id, unit: UnitType.PIECE, station: 'Tandir sex', isFeatured: true },
    { name: 'Qovoqli somsa', nameRu: 'Самса с тыквой', price: 8000, cost: 3500, catId: cat5.id, unit: UnitType.PIECE, station: 'Tandir sex' },
    { name: 'Tandir non (patir)', nameRu: 'Самаркандский патыр', price: 6000, cost: 2500, catId: cat5.id, unit: UnitType.PIECE, station: 'Tandir sex' },
    { name: 'Obi non', nameRu: 'Оби нон', price: 4000, cost: 1800, catId: cat5.id, unit: UnitType.PIECE, station: 'Tandir sex' },

    // Ichimliklar va choy
    { name: 'Ko\'k choy (choynak)', nameRu: 'Зеленый чай (чайник)', price: 5000, cost: 1000, catId: cat6.id, unit: UnitType.PORTION, station: 'Bar' },
    { name: 'Qora choy (choynak)', nameRu: 'Черный чай (чайник)', price: 5000, cost: 1000, catId: cat6.id, unit: UnitType.PORTION, station: 'Bar' },
    { name: 'Limonli ko\'k choy', nameRu: 'Зеленый чай с лимоном', price: 8000, cost: 2500, catId: cat6.id, unit: UnitType.PORTION, station: 'Bar' },
    { name: 'Kompot (uy mevalaridan 1L)', nameRu: 'Домашний компот (1л)', price: 15000, cost: 5000, catId: cat6.id, unit: UnitType.PORTION, station: 'Bar' },
    { name: 'Gazli mineral suv (0.5L)', nameRu: 'Минеральная вода (0.5л)', price: 6000, cost: 3500, catId: cat6.id, unit: UnitType.PIECE, station: 'Bar' }
  ];

  let oshItemId = '';

  for (const d of dishes) {
    const itemId = generateUUIDv7();
    if (d.name.includes('Choyxona palov')) {
      oshItemId = itemId;
    }

    await prisma.menuItem.create({
      data: {
        id: itemId,
        name: d.name,
        nameRu: d.nameRu,
        price: d.price,
        costPrice: d.cost,
        unit: d.unit,
        categoryId: d.catId,
        kitchenStationId: d.station,
        isAvailable: true,
        isFeatured: (d as any).isFeatured || false
      }
    });
  }

  console.log(`✅ ${dishes.length} ta o'zbek milliy taomlari muvaffaqiyatli kiritildi.`);

  // 9. Palov uchun o'lchamlar (Variants), Qo'shimchalar (Modifiers) va Retsept (Recipe)
  if (oshItemId) {
    // Variantlar (0.5 porsiya, 1 porsiya, 1 kg)
    await prisma.menuItemVariant.createMany({
      data: [
        { id: generateUUIDv7(), menuItemId: oshItemId, name: '0.5 porsiya', price: 22000, costPrice: 12000 },
        { id: generateUUIDv7(), menuItemId: oshItemId, name: '1 porsiya (standart)', price: 35000, costPrice: 20000 },
        { id: generateUUIDv7(), menuItemId: oshItemId, name: 'Katta tovoq (1 kg)', price: 130000, costPrice: 75000 }
      ]
    });

    // Modifierlar guruhi
    const modGroupId = generateUUIDv7();
    await prisma.modifierGroup.create({
      data: {
        id: modGroupId,
        menuItemId: oshItemId,
        name: 'Oshga qo\'shimchalar',
        minSelect: 0,
        maxSelect: 4,
        isRequired: false
      }
    });

    await prisma.modifier.createMany({
      data: [
        { id: generateUUIDv7(), groupId: modGroupId, name: '+ Ot qazisi (1 bo\'lak)', price: 10000, costPrice: 6000 },
        { id: generateUUIDv7(), groupId: modGroupId, name: '+ Bedana tuxumi (2 dona)', price: 4000, costPrice: 2000 },
        { id: generateUUIDv7(), groupId: modGroupId, name: '+ Qo\'shimcha dumba', price: 7000, costPrice: 4000 },
        { id: generateUUIDv7(), groupId: modGroupId, name: 'Piyozsiz / Kam yog\'li', price: 0, costPrice: 0 }
      ]
    });

    // Retsept (1 porsiya osh = 150g guruch + 120g go'sht + 100g sabzi + 30ml yog')
    const recipeId = generateUUIDv7();
    await prisma.recipe.create({
      data: {
        id: recipeId,
        menuItemId: oshItemId,
        description: '1 porsiya Choyxona palov texnologik xaritasi'
      }
    });

    await prisma.recipeItem.createMany({
      data: [
        { id: generateUUIDv7(), recipeId, ingredientId: ingRice.id, quantity: 0.150 },
        { id: generateUUIDv7(), recipeId, ingredientId: ingBeef.id, quantity: 0.120 },
        { id: generateUUIDv7(), recipeId, ingredientId: ingCarrot.id, quantity: 0.100 },
        { id: generateUUIDv7(), recipeId, ingredientId: ingOil.id, quantity: 0.030 },
        { id: generateUUIDv7(), recipeId, ingredientId: ingOnion.id, quantity: 0.050 }
      ]
    });

    console.log('✅ Palov uchun variantlar, qo\'shimchalar va retsept kalkulyatsiyasi kiritildi.');
  }

  // 10. Chegirmalar (Discounts)
  await prisma.discount.createMany({
    data: [
      { id: generateUUIDv7(), name: 'Doimiy mijoz (5%)', percent: 5, fixedAmount: 0 },
      { id: generateUUIDv7(), name: 'Katta buyurtma (10%)', percent: 10, fixedAmount: 0 },
      { id: generateUUIDv7(), name: 'Tushlik aksiyasi (Happy Hour - 15%)', percent: 15, fixedAmount: 0 }
    ]
  });

  console.log('🎉 Seed to\'liq va muvaffaqiyatli yakunlandi!');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
