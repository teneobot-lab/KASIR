import { useParams } from "wouter";
import { useGetCustomer, useGetCustomerTransactions, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Phone, Mail, MapPin, Star, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

const tierColors: Record<string, string> = {
  regular: "bg-gray-100 text-gray-700",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-amber-100 text-amber-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { data: customer, isLoading } = useGetCustomer(id, { query: { enabled: !!id, queryKey: ["customer", id] } });
  const { data: transactions } = useGetCustomerTransactions(id, { query: { enabled: !!id, queryKey: ["customer-transactions", id] } });

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  if (isLoading || !customer) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">Memuat data pelanggan...</div>
  );

  const txList = Array.isArray(transactions) ? transactions : (transactions as any)?.data ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/customers"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{customer.memberCode}</p>
        </div>
        <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium capitalize ${tierColors[customer.tier] ?? ""}`}>{customer.tier}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Star className="w-6 h-6 text-amber-500" />
          <div><p className="text-sm text-muted-foreground">Poin Loyalitas</p><p className="text-2xl font-bold">{customer.points.toLocaleString("id-ID")}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-blue-500" />
          <div><p className="text-sm text-muted-foreground">Total Transaksi</p><p className="text-2xl font-bold">{customer.totalTransactions}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-green-500 font-bold text-sm">Rp</div>
          <div><p className="text-sm text-muted-foreground">Total Belanja</p><p className="text-xl font-bold">{formatCurrency(customer.totalSpent)}</p></div>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Informasi Pelanggan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {customer.phone && <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span>{customer.phone}</span></div>}
          {customer.email && <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span>{customer.email}</span></div>}
          {customer.address && <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{customer.address}</span></div>}
          <div className="text-sm text-muted-foreground">Bergabung: {formatDate(customer.createdAt)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Transaksi</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Struk</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txList.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada transaksi.</TableCell></TableRow>
              ) : txList.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.receiptNumber}</TableCell>
                  <TableCell>{formatDate(t.createdAt)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(t.total)}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "completed" ? "default" : "destructive"} className="text-xs">{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
