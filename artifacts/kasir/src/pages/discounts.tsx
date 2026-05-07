import { useState } from "react";
import { useListDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount, getListDiscountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag, Percent } from "lucide-react";
import { useForm } from "react-hook-form";

type DiscountForm = { name: string; code: string; type: string; value: string; minPurchase: string; maxDiscount: string; isActive: boolean };

export default function Discounts() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { data: discounts, isLoading } = useListDiscounts();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const deleteDiscount = useDeleteDiscount();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, watch, setValue } = useForm<DiscountForm>({
    defaultValues: { name: "", code: "", type: "percentage", value: "", minPurchase: "", maxDiscount: "", isActive: true }
  });

  const openAdd = () => { setEditId(null); reset({ name: "", code: "", type: "percentage", value: "", minPurchase: "", maxDiscount: "", isActive: true }); setShowForm(true); };
  const openEdit = (d: any) => {
    setEditId(d.id);
    reset({ name: d.name, code: d.code ?? "", type: d.type, value: String(d.value), minPurchase: d.minPurchase ? String(d.minPurchase) : "", maxDiscount: d.maxDiscount ? String(d.maxDiscount) : "", isActive: d.isActive });
    setShowForm(true);
  };

  const onSubmit = handleSubmit((data) => {
    const payload = { name: data.name, code: data.code || undefined, type: data.type as "percentage" | "fixed", value: Number(data.value), minPurchase: data.minPurchase ? Number(data.minPurchase) : undefined, maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : undefined, isActive: data.isActive };
    if (editId) {
      updateDiscount.mutate({ id: editId, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDiscountsQueryKey() }); toast({ title: "Diskon diperbarui" }); setShowForm(false); },
      });
    } else {
      createDiscount.mutate({ data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDiscountsQueryKey() }); toast({ title: "Diskon ditambahkan" }); setShowForm(false); },
      });
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Hapus diskon ini?")) {
      deleteDiscount.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListDiscountsQueryKey() }); toast({ title: "Diskon dihapus" }); } });
    }
  };

  const handleToggle = (d: any) => {
    updateDiscount.mutate({ id: d.id, data: { name: d.name, type: d.type as "percentage" | "fixed", value: Number(d.value), isActive: !d.isActive } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDiscountsQueryKey() }) });
  };

  const discountList = Array.isArray(discounts) ? discounts : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diskon & Promo</h1>
          <p className="text-muted-foreground mt-1">Kelola program diskon dan kode promo.</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-discount"><Plus className="w-4 h-4 mr-2" /> Tambah Diskon</Button>
      </div>
      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
              <TableHead className="text-right">Min. Belanja</TableHead>
              <TableHead className="text-right">Penggunaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
            ) : discountList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Tag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Belum ada diskon.</p>
                </TableCell>
              </TableRow>
            ) : discountList.map((d: any) => (
              <TableRow key={d.id} data-testid={`row-discount-${d.id}`}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><code className="text-sm bg-muted px-1.5 py-0.5 rounded">{d.code ?? "-"}</code></TableCell>
                <TableCell>
                  <Badge variant="outline">{d.type === "percentage" ? "Persentase" : d.type === "fixed" ? "Nominal" : "Beli X Get Y"}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{d.type === "percentage" ? `${d.value}%` : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(d.value)}</TableCell>
                <TableCell className="text-right">{d.minPurchase ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(d.minPurchase) : "-"}</TableCell>
                <TableCell className="text-right">{d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""}</TableCell>
                <TableCell>
                  <Switch checked={d.isActive} onCheckedChange={() => handleToggle(d)} data-testid={`switch-discount-${d.id}`} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} data-testid={`button-edit-${d.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} data-testid={`button-delete-${d.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Diskon" : "Tambah Diskon"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nama *</Label><Input data-testid="input-discount-name" {...register("name", { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={watch("type")} onValueChange={(v) => setValue("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase</SelectItem>
                    <SelectItem value="fixed">Nominal Tetap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Nilai *</Label><Input type="number" data-testid="input-discount-value" {...register("value", { required: true })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Kode Promo</Label><Input data-testid="input-discount-code" {...register("code")} placeholder="PROMO10" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Min. Pembelian</Label><Input type="number" {...register("minPurchase")} placeholder="0" /></div>
              <div className="space-y-1.5"><Label>Maks. Diskon</Label><Input type="number" {...register("maxDiscount")} placeholder="0" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
              <Label>Aktif</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" data-testid="button-submit-discount" disabled={createDiscount.isPending || updateDiscount.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
