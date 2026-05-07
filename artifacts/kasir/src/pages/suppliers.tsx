import { useState } from "react";
import { useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";

type SupplierForm = { name: string; contact: string; phone: string; email: string; address: string };

export default function Suppliers() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading } = useListSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset } = useForm<SupplierForm>({ defaultValues: { name: "", contact: "", phone: "", email: "", address: "" } });

  const supplierList = (Array.isArray(suppliers) ? suppliers : []).filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditId(null); reset({ name: "", contact: "", phone: "", email: "", address: "" }); setShowForm(true); };
  const openEdit = (s: any) => { setEditId(s.id); reset({ name: s.name, contact: s.contact ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" }); setShowForm(true); };

  const onSubmit = handleSubmit((data) => {
    const payload = { name: data.name, contact: data.contact || undefined, phone: data.phone || undefined, email: data.email || undefined, address: data.address || undefined };
    if (editId) {
      updateSupplier.mutate({ id: editId, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier diperbarui" }); setShowForm(false); },
      });
    } else {
      createSupplier.mutate({ data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier ditambahkan" }); setShowForm(false); },
      });
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Hapus supplier ini?")) {
      deleteSupplier.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier dihapus" }); } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier</h1>
          <p className="text-muted-foreground mt-1">Kelola data pemasok dan vendor.</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-supplier"><Plus className="w-4 h-4 mr-2" /> Tambah Supplier</Button>
      </div>
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Input placeholder="Cari supplier..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-supplier" />
        </div>
      </div>
      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
            ) : supplierList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Truck className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Belum ada supplier.</p>
                </TableCell>
              </TableRow>
            ) : supplierList.map((s: any) => (
              <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact ?? "-"}</TableCell>
                <TableCell>
                  {s.phone ? <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="w-3 h-3" />{s.phone}</a> : "-"}
                </TableCell>
                <TableCell>
                  {s.email ? <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="w-3 h-3" />{s.email}</a> : "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.address ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`button-edit-${s.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} data-testid={`button-delete-${s.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nama Perusahaan *</Label><Input data-testid="input-supplier-name" {...register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>Nama Kontak</Label><Input {...register("contact")} placeholder="Nama PIC" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Telepon</Label><Input {...register("phone")} placeholder="08xx..." /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register("email")} /></div>
            </div>
            <div className="space-y-1.5"><Label>Alamat</Label><Input {...register("address")} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" data-testid="button-submit-supplier" disabled={createSupplier.isPending || updateSupplier.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
