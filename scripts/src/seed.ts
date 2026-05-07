import { db, usersTable, categoriesTable, suppliersTable, productsTable, customersTable, discountsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Users
  const existingUsers = await db.select().from(usersTable);
  if (existingUsers.length === 0) {
    await db.insert(usersTable).values([
      { username: "admin", name: "Administrator", email: "admin@kasir.co.id", passwordHash: "admin123", role: "super_admin", isActive: true },
      { username: "kasir1", name: "Budi Santoso", email: "budi@kasir.co.id", passwordHash: "admin123", role: "cashier", isActive: true },
      { username: "kasir2", name: "Siti Rahayu", email: "siti@kasir.co.id", passwordHash: "admin123", role: "cashier", isActive: true },
      { username: "gudang", name: "Ahmad Wijaya", email: "ahmad@kasir.co.id", passwordHash: "admin123", role: "warehouse", isActive: true },
      { username: "akuntan", name: "Dewi Kusuma", email: "dewi@kasir.co.id", passwordHash: "admin123", role: "accountant", isActive: true },
    ]);
    console.log("Users seeded");
  }

  // Categories
  const existingCats = await db.select().from(categoriesTable);
  if (existingCats.length === 0) {
    await db.insert(categoriesTable).values([
      { name: "Minuman", description: "Semua jenis minuman", color: "#3B82F6" },
      { name: "Makanan", description: "Makanan dan snack", color: "#F59E0B" },
      { name: "Sembako", description: "Kebutuhan pokok harian", color: "#10B981" },
      { name: "Kebersihan", description: "Produk kebersihan rumah", color: "#8B5CF6" },
      { name: "Kesehatan", description: "Produk kesehatan dan vitamin", color: "#EF4444" },
      { name: "Elektronik", description: "Aksesoris dan elektronik kecil", color: "#6366F1" },
      { name: "Rokok", description: "Rokok dan tembakau", color: "#78716C" },
    ]);
    console.log("Categories seeded");
  }

  // Suppliers
  const existingSuppliers = await db.select().from(suppliersTable);
  if (existingSuppliers.length === 0) {
    await db.insert(suppliersTable).values([
      { name: "PT Indofood Sukses Makmur", contact: "Hendra", phone: "021-5795-8822", email: "order@indofood.co.id", address: "Jakarta Selatan" },
      { name: "PT Coca-Cola Indonesia", contact: "Rina", phone: "021-7884-9900", email: "supply@coca-cola.co.id", address: "Jakarta Timur" },
      { name: "PT Unilever Indonesia", contact: "Tono", phone: "021-5299-5000", email: "trade@unilever.co.id", address: "Tangerang" },
      { name: "CV Surya Abadi Distributor", contact: "Pak Surya", phone: "0812-3456-7890", email: "surya.abadi@gmail.com", address: "Bandung" },
    ]);
    console.log("Suppliers seeded");
  }

  // Products
  const cats = await db.select().from(categoriesTable);
  const catMap = new Map(cats.map((c) => [c.name, c.id]));
  const existingProducts = await db.select().from(productsTable);
  if (existingProducts.length === 0) {
    await db.insert(productsTable).values([
      { name: "Aqua 600ml", sku: "AQU-001", barcode: "8999999012345", categoryId: catMap.get("Minuman"), price: "4000", costPrice: "2500", memberPrice: "3500", stock: 250, minStock: 50, unit: "botol", isActive: true },
      { name: "Aqua 1500ml", sku: "AQU-002", barcode: "8999999012346", categoryId: catMap.get("Minuman"), price: "7000", costPrice: "4500", memberPrice: "6500", stock: 120, minStock: 30, unit: "botol", isActive: true },
      { name: "Teh Botol Sosro 350ml", sku: "TBS-001", barcode: "8999999023456", categoryId: catMap.get("Minuman"), price: "5000", costPrice: "3000", memberPrice: "4500", stock: 180, minStock: 40, unit: "botol", isActive: true },
      { name: "Pocari Sweat 350ml", sku: "POC-001", barcode: "4901777350013", categoryId: catMap.get("Minuman"), price: "9000", costPrice: "6000", memberPrice: "8000", stock: 96, minStock: 24, unit: "kaleng", isActive: true },
      { name: "Coca-Cola 330ml", sku: "CCL-001", barcode: "5449000000996", categoryId: catMap.get("Minuman"), price: "8000", costPrice: "5500", memberPrice: "7000", stock: 72, minStock: 24, unit: "kaleng", isActive: true },
      { name: "Indomie Goreng", sku: "IMI-001", barcode: "8999999045678", categoryId: catMap.get("Makanan"), price: "3500", costPrice: "2200", memberPrice: "3000", stock: 500, minStock: 100, unit: "bungkus", isActive: true },
      { name: "Indomie Kuah Ayam", sku: "IMI-002", barcode: "8999999045679", categoryId: catMap.get("Makanan"), price: "3500", costPrice: "2200", memberPrice: "3000", stock: 400, minStock: 100, unit: "bungkus", isActive: true },
      { name: "Chitato Sapi Panggang 68g", sku: "CHT-001", barcode: "8999999056789", categoryId: catMap.get("Makanan"), price: "12000", costPrice: "8000", memberPrice: "11000", stock: 60, minStock: 20, unit: "pcs", isActive: true },
      { name: "Beng-Beng Wafer", sku: "BBW-001", barcode: "8999999067890", categoryId: catMap.get("Makanan"), price: "4000", costPrice: "2500", memberPrice: "3500", stock: 200, minStock: 50, unit: "pcs", isActive: true },
      { name: "Gula Pasir 1kg", sku: "GUL-001", barcode: "8999999078901", categoryId: catMap.get("Sembako"), price: "15000", costPrice: "12000", memberPrice: "14000", stock: 80, minStock: 20, unit: "kg", isActive: true },
      { name: "Beras Premium 5kg", sku: "BRS-001", barcode: "8999999089012", categoryId: catMap.get("Sembako"), price: "72000", costPrice: "58000", memberPrice: "68000", stock: 40, minStock: 10, unit: "kg", isActive: true },
      { name: "Minyak Goreng Bimoli 1L", sku: "MNY-001", barcode: "8999999090123", categoryId: catMap.get("Sembako"), price: "22000", costPrice: "17000", memberPrice: "20000", stock: 60, minStock: 15, unit: "botol", isActive: true },
      { name: "Sabun Lifebuoy 90g", sku: "SBN-001", barcode: "8999999101234", categoryId: catMap.get("Kebersihan"), price: "4500", costPrice: "3000", memberPrice: "4000", stock: 8, minStock: 24, unit: "pcs", isActive: true },
      { name: "Shampo Clear 170ml", sku: "SHP-001", barcode: "8999999112345", categoryId: catMap.get("Kebersihan"), price: "18000", costPrice: "13000", memberPrice: "16000", stock: 45, minStock: 15, unit: "botol", isActive: true },
      { name: "Sunlight Pencuci Piring 755ml", sku: "SLT-001", barcode: "8999999123456", categoryId: catMap.get("Kebersihan"), price: "17000", costPrice: "12000", memberPrice: "15000", stock: 3, minStock: 12, unit: "botol", isActive: true },
      { name: "Paracetamol 500mg (strip)", sku: "PAR-001", barcode: "8999999134567", categoryId: catMap.get("Kesehatan"), price: "5000", costPrice: "3000", memberPrice: "4500", stock: 100, minStock: 30, unit: "strip", isActive: true },
      { name: "Vitamin C 500mg Redoxon", sku: "VTC-001", barcode: "7613331006205", categoryId: catMap.get("Kesehatan"), price: "35000", costPrice: "25000", memberPrice: "32000", stock: 30, minStock: 10, unit: "tube", isActive: true },
      { name: "Gudang Garam Surya 12", sku: "GGS-001", barcode: "8999999145678", categoryId: catMap.get("Rokok"), price: "24000", costPrice: "20000", memberPrice: "23000", stock: 50, minStock: 20, unit: "bungkus", isActive: true },
      { name: "Sampoerna Mild 16", sku: "SML-001", barcode: "8999999156789", categoryId: catMap.get("Rokok"), price: "27000", costPrice: "23000", memberPrice: "26000", stock: 4, minStock: 20, unit: "bungkus", isActive: true },
      { name: "Charger USB-C 20W", sku: "CHR-001", barcode: "8999999167890", categoryId: catMap.get("Elektronik"), price: "85000", costPrice: "55000", memberPrice: "78000", stock: 20, minStock: 5, unit: "pcs", isActive: true },
    ]);
    console.log("Products seeded");
  }

  // Customers
  const existingCustomers = await db.select().from(customersTable);
  if (existingCustomers.length === 0) {
    await db.insert(customersTable).values([
      { name: "Andi Prasetyo", phone: "0812-1111-2222", email: "andi@gmail.com", memberCode: "MBR000001", tier: "gold", points: 1250, totalSpent: "5800000", totalTransactions: 48, isActive: true },
      { name: "Budi Hartono", phone: "0813-2222-3333", email: "budi.h@gmail.com", memberCode: "MBR000002", tier: "silver", points: 450, totalSpent: "1750000", totalTransactions: 22, isActive: true },
      { name: "Citra Dewi", phone: "0814-3333-4444", email: "citra@yahoo.com", memberCode: "MBR000003", tier: "regular", points: 120, totalSpent: "380000", totalTransactions: 8, isActive: true },
      { name: "Doni Kurniawan", phone: "0815-4444-5555", memberCode: "MBR000004", tier: "platinum", points: 8900, totalSpent: "12500000", totalTransactions: 156, isActive: true },
      { name: "Eka Susilawati", phone: "0816-5555-6666", email: "eka@gmail.com", memberCode: "MBR000005", tier: "silver", points: 680, totalSpent: "2100000", totalTransactions: 35, isActive: true },
      { name: "Fauzi Rahman", phone: "0817-6666-7777", memberCode: "MBR000006", tier: "regular", points: 50, totalSpent: "150000", totalTransactions: 3, isActive: true },
      { name: "Gita Nurdiana", phone: "0818-7777-8888", email: "gita.nur@gmail.com", memberCode: "MBR000007", tier: "gold", points: 2100, totalSpent: "7200000", totalTransactions: 89, isActive: true },
    ]);
    console.log("Customers seeded");
  }

  // Discounts
  const existingDiscounts = await db.select().from(discountsTable);
  if (existingDiscounts.length === 0) {
    await db.insert(discountsTable).values([
      { name: "Diskon Member 5%", code: "MEMBER5", type: "percentage", value: "5", minPurchase: "50000", isActive: true, usageCount: 0 },
      { name: "Promo Akhir Pekan 10%", code: "WEEKEND10", type: "percentage", value: "10", minPurchase: "100000", maxDiscount: "25000", isActive: true, usageCount: 0 },
      { name: "Flash Sale Rp 20.000", code: "FLASH20K", type: "fixed", value: "20000", minPurchase: "150000", isActive: true, usageCount: 0 },
      { name: "Diskon Sembako 8%", code: "SEMBAKO8", type: "percentage", value: "8", minPurchase: "30000", maxDiscount: "15000", isActive: true, usageCount: 0 },
      { name: "Member Gold 15%", code: "GOLD15", type: "percentage", value: "15", minPurchase: "200000", maxDiscount: "50000", isActive: false, usageCount: 0 },
    ]);
    console.log("Discounts seeded");
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
