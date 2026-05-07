import { useState } from "react";
import { Link } from "wouter";
import { useListCustomers, useCreateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";

const tierColors: Record<string, string> = {
  regular: "bg-gray-100 text-gray-700",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-amber-100 text-amber-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { data: customersData, isLoading } = useListCustomers({ search, limit: 100 });
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const customers = (customersData as any)?.data ?? customersData ?? [];

  const { register, handleSubmit, reset } = useForm<{ name: string; phone: string; email: string; address: string }>();

  const onAdd = handleSubmit((data) => {
    createCustomer.mutate({ data: { name: data.name, phone: data.phone || undefined, email: data.email || undefined, address: data.address || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); toast({ title: "Pelanggan ditambahkan" }); setShowAdd(false); reset(); },
      onError: () => toast({ title: "Gagal menambahkan", variant: "destructive" }),
    });
  });

  const handleDelete = (id: number) => {
    if (confirm("Hapus pelanggan ini?")) {
      deleteCustomer.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); toast({ title: "Pelanggan dihapus" }); },
      });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-muted-foreground mt-1">Kelola data pelanggan dan program loyalitas.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} data-testid="button-add-customer"><Plus className="w-4 h-4 mr-2" /> Tambah Pelanggan</Button>
      </div>
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama, telepon, email..." className="pl-9" data-testid="input-search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode Member</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Poin</TableHead>
              <TableHead className="text-right">Total Belanja</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Belum ada pelanggan.</p>
                </TableCell>
              </TableRow>
            ) : customers.map((c: any) => (
              <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-sm">{c.memberCode ?? "-"}</TableCell>
                <TableCell>{c.phone ?? "-"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tierColors[c.tier] ?? ""}`}>{c.tier}</span>
                </TableCell>
                <TableCell className="text-right">{c.points.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.totalSpent)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild><Link href={`/customers/${c.id}`} data-testid={`link-customer-${c.id}`}><Eye className="w-4 h-4" /></Link></Button>
                    <Button variant="ghost" size="icon" data-testid={`button-delete-${c.id}`} onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Pelanggan Baru</DialogTitle></DialogHeader>
          <form onSubmit={onAdd} className="space-y-4">
            <div className="space-y-1.5"><Label>Nama *</Label><Input data-testid="input-customer-name" {...register("name", { required: true })} placeholder="Nama lengkap" /></div>
            <div className="space-y-1.5"><Label>Telepon</Label><Input data-testid="input-customer-phone" {...register("phone")} placeholder="08xx-xxxx-xxxx" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input data-testid="input-customer-email" type="email" {...register("email")} placeholder="email@example.com" /></div>
            <div className="space-y-1.5"><Label>Alamat</Label><Input data-testid="input-customer-address" {...register("address")} placeholder="Alamat lengkap" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
              <Button type="submit" data-testid="button-submit-customer" disabled={createCustomer.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
