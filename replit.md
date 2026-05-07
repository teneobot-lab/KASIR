# Sistem Kasir Enterprise

Full-stack enterprise POS (Point of Sale) system untuk bisnis retail, restoran, dan franchise di Indonesia.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080)
- `pnpm --filter @workspace/kasir run dev` — jalankan frontend (port 22227)
- `pnpm run typecheck` — full typecheck seluruh package
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks dan Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed database dengan demo data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — secret untuk session

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, shadcn/ui, wouter (routing), Recharts (charts), TanStack Query
- API: Express 5, pino (logging)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kasir/src/pages/` — semua halaman frontend (17+ halaman)
- `artifacts/kasir/src/App.tsx` — routing untuk semua halaman
- `artifacts/kasir/src/lib/auth.tsx` — auth context/provider
- `artifacts/api-server/src/routes/` — semua route handler API
- `artifacts/api-server/src/routes/transactions.ts` — logika transaksi POS utama
- `artifacts/api-server/src/routes/reports.ts` — dashboard + analytics endpoints
- `lib/db/src/schema/` — 9 schema files (users, categories, suppliers, products, customers, shifts, transactions, stock_movements, discounts)
- `lib/api-spec/openapi.yaml` — source of truth untuk API contract
- `lib/api-client-react/src/` — generated hooks + setAuthTokenGetter

## Architecture decisions

- **Auth via base64 token**: Token sederhana berisi `{id, role, iat}` encoded base64. Password di-hash dengan bcrypt. Token disimpan di `localStorage` key `kasir_token`.
- **Contract-first API**: OpenAPI spec di `lib/api-spec/openapi.yaml` → Orval generate React Query hooks dan Zod schemas. Server dan client keduanya menggunakan generated types.
- **Numeric fields as strings in Drizzle**: Drizzle menyimpan `numeric` column sebagai string. Gunakan `String(val)` saat insert, `Number(field)` saat read.
- **Routes tanpa /api prefix di handler**: Prefix `/api` ditambahkan oleh `app.use("/api", router)` di `app.ts`. Handler menulis `/products`, bukan `/api/products`.
- **Shared proxy routing**: Semua traffic melalui proxy di port 80. API di `/api`, frontend di `/`. Jangan gunakan Vite proxy config.

## Product

- **Login multi-role**: super_admin, admin, kasir (cashier), supervisor, gudang (warehouse)
- **Dashboard**: revenue hari ini, jumlah transaksi, produk stok rendah, grafik penjualan
- **POS (Kasir)**: scan/pilih produk, cart, diskon, pembayaran tunai/kartu/e-wallet, cetak struk
- **Produk & Kategori**: CRUD produk + kategori, upload gambar, multi-satuan
- **Inventori**: level stok, riwayat pergerakan stok, alert stok rendah
- **Pelanggan**: profil pelanggan, tier membership, riwayat transaksi
- **Diskon & Promo**: persentase dan nominal, kode promo, min. pembelian
- **Supplier**: manajemen supplier
- **Shift**: buka/tutup shift kasir, ringkasan per shift
- **Laporan**: laporan penjualan, produk terlaris, laporan pelanggan
- **Manajemen User**: CRUD user, pengaturan role

## User preferences

- Bahasa Indonesia untuk UI dan komunikasi
- Demo accounts: admin/admin123 (super_admin), cashier1/cashier123

## Gotchas

- Selalu rebuild API server setelah perubahan: `pnpm --filter @workspace/api-server run build`
- Setelah push schema baru, jalankan seed ulang: `pnpm --filter @workspace/scripts run seed`
- API routes tidak boleh menggunakan prefix `/api` (sudah ditambahkan di app.ts)
- `useGetLowStockAlerts()` dan hook inventory mengembalikan array langsung, bukan `{ data: [] }`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
