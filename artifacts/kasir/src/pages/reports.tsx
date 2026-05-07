import { useState } from "react";
import { useGetSalesReport, useGetTopProducts, useGetRevenueByCategory, useGetPaymentMethodStats, useGetHourlySales, getGetSalesReportQueryKey, getGetTopProductsQueryKey, getGetRevenueByCategoryQueryKey, getGetPaymentMethodStatsQueryKey, getGetHourlySalesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, ShoppingCart, DollarSign, BarChart2 } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#6366F1"];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
}

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: thirtyDaysAgo, to: today });

  const { data: salesReport } = useGetSalesReport({ from: applied.from, to: applied.to, groupBy: "day" }, {
    query: { queryKey: getGetSalesReportQueryKey({ from: applied.from, to: applied.to, groupBy: "day" }) }
  });
  const { data: topProducts } = useGetTopProducts({ from: applied.from, to: applied.to, limit: 10 }, {
    query: { queryKey: getGetTopProductsQueryKey({ from: applied.from, to: applied.to, limit: 10 }) }
  });
  const { data: categoryRevenue } = useGetRevenueByCategory({ from: applied.from, to: applied.to }, {
    query: { queryKey: getGetRevenueByCategoryQueryKey({ from: applied.from, to: applied.to }) }
  });
  const { data: paymentStats } = useGetPaymentMethodStats({ from: applied.from, to: applied.to }, {
    query: { queryKey: getGetPaymentMethodStatsQueryKey({ from: applied.from, to: applied.to }) }
  });
  const { data: hourlySales } = useGetHourlySales({ date: applied.to }, {
    query: { queryKey: getGetHourlySalesQueryKey({ date: applied.to }) }
  });

  const salesData = (salesReport as any)?.data ?? [];
  const topProductList = Array.isArray(topProducts) ? topProducts : [];
  const catRevList = Array.isArray(categoryRevenue) ? categoryRevenue : [];
  const payList = Array.isArray(paymentStats) ? paymentStats : [];
  const hourlyList = Array.isArray(hourlySales) ? hourlySales : [];

  const apply = () => setApplied({ from, to });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
        <p className="text-muted-foreground mt-1">Analisa performa toko Anda.</p>
      </div>

      <div className="flex items-end gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="space-y-1.5">
          <Label>Dari</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="input-from-date" />
        </div>
        <div className="space-y-1.5">
          <Label>Sampai</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="input-to-date" />
        </div>
        <Button onClick={apply} data-testid="button-apply-filter">Terapkan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-green-500" />
          <div><p className="text-sm text-muted-foreground">Total Pendapatan</p><p className="text-2xl font-bold">{formatCurrency((salesReport as any)?.totalRevenue ?? 0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-500" />
          <div><p className="text-sm text-muted-foreground">Total Transaksi</p><p className="text-2xl font-bold">{((salesReport as any)?.totalTransactions ?? 0).toLocaleString("id-ID")}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <div><p className="text-sm text-muted-foreground">Rata-rata Transaksi</p><p className="text-2xl font-bold">{formatCurrency((salesReport as any)?.avgOrderValue ?? 0)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tren Pendapatan</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colorRevenue)" strokeWidth={2} name="Pendapatan" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Metode Pembayaran</CardTitle></CardHeader>
          <CardContent>
            {payList.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={payList.map((p: any) => ({ name: p.method.toUpperCase(), value: p.amount }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {payList.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Penjualan per Jam (Hari Ini)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyList}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(h) => `Jam ${h}:00`} />
                <Bar dataKey="revenue" fill="#10B981" radius={[3, 3, 0, 0]} name="Pendapatan" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Produk Terlaris</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty Terjual</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProductList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
              ) : topProductList.map((p: any, i: number) => (
                <TableRow key={p.productId}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.productName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-right">{p.quantitySold.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pendapatan per Kategori</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Persentase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catRevList.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
              ) : catRevList.map((c: any) => (
                <TableRow key={c.categoryId ?? c.categoryName}>
                  <TableCell className="font-medium">{c.categoryName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                  <TableCell className="text-right">{c.transactions}</TableCell>
                  <TableCell className="text-right">{c.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
