import { useState } from "react";
import { useListShifts, useGetActiveShift, useOpenShift, useCloseShift, getListShiftsQueryKey, getGetActiveShiftQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, StopCircle, Clock, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";

export default function Shifts() {
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const { data: activeShiftData } = useGetActiveShift();
  const { data: shifts, isLoading } = useListShifts({});
  const openShift = useOpenShift();
  const closeShift = useCloseShift();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const activeShift = (activeShiftData as any)?.shift ?? null;

  const { register: regOpen, handleSubmit: handleOpen, reset: resetOpen } = useForm<{ openingCash: string }>();
  const { register: regClose, handleSubmit: handleClose, reset: resetClose } = useForm<{ closingCash: string; note: string }>();

  const onOpenShift = handleOpen((data) => {
    openShift.mutate({ data: { openingCash: Number(data.openingCash) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetActiveShiftQueryKey() });
        toast({ title: "Shift dibuka" });
        setShowOpen(false);
        resetOpen();
      },
      onError: () => toast({ title: "Gagal membuka shift", variant: "destructive" }),
    });
  });

  const onCloseShift = handleClose((data) => {
    if (!activeShift) return;
    closeShift.mutate({ id: activeShift.id, data: { closingCash: Number(data.closingCash), note: data.note || undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetActiveShiftQueryKey() });
        toast({ title: "Shift ditutup" });
        setShowClose(false);
        resetClose();
      },
      onError: () => toast({ title: "Gagal menutup shift", variant: "destructive" }),
    });
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  const formatDate = (d: string) => new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const shiftsList = Array.isArray(shifts) ? shifts : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Kasir</h1>
          <p className="text-muted-foreground mt-1">Kelola shift dan laporan Z kasir.</p>
        </div>
        <div className="flex gap-2">
          {activeShift ? (
            <Button variant="destructive" onClick={() => setShowClose(true)} data-testid="button-close-shift">
              <StopCircle className="w-4 h-4 mr-2" /> Tutup Shift
            </Button>
          ) : (
            <Button onClick={() => setShowOpen(true)} data-testid="button-open-shift">
              <PlayCircle className="w-4 h-4 mr-2" /> Buka Shift
            </Button>
          )}
        </div>
      </div>

      {activeShift && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader><CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Shift Aktif</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-muted-foreground">Kasir</p><p className="font-semibold">{activeShift.cashierName}</p></div>
            <div><p className="text-xs text-muted-foreground">Modal Awal</p><p className="font-semibold">{formatCurrency(activeShift.openingCash)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="font-semibold">{activeShift.totalTransactions}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Penjualan</p><p className="font-semibold">{formatCurrency(activeShift.totalRevenue)}</p></div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kasir</TableHead>
              <TableHead>Dibuka</TableHead>
              <TableHead>Ditutup</TableHead>
              <TableHead className="text-right">Modal</TableHead>
              <TableHead className="text-right">Penjualan</TableHead>
              <TableHead className="text-right">Transaksi</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
            ) : shiftsList.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada shift.</TableCell></TableRow>
            ) : shiftsList.map((s: any) => (
              <TableRow key={s.id} data-testid={`row-shift-${s.id}`}>
                <TableCell className="font-medium">{s.cashierName}</TableCell>
                <TableCell className="text-sm">{formatDate(s.openedAt)}</TableCell>
                <TableCell className="text-sm">{s.closedAt ? formatDate(s.closedAt) : "-"}</TableCell>
                <TableCell className="text-right">{formatCurrency(s.openingCash)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(s.totalRevenue)}</TableCell>
                <TableCell className="text-right">{s.totalTransactions}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status === "open" ? "Aktif" : "Selesai"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buka Shift Baru</DialogTitle></DialogHeader>
          <form onSubmit={onOpenShift} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modal Awal (Rp)</Label>
              <Input type="number" data-testid="input-opening-cash" {...regOpen("openingCash", { required: true })} placeholder="500000" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowOpen(false)}>Batal</Button>
              <Button type="submit" data-testid="button-confirm-open" disabled={openShift.isPending}>Buka Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tutup Shift</DialogTitle></DialogHeader>
          <form onSubmit={onCloseShift} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Uang di Laci (Rp)</Label>
              <Input type="number" data-testid="input-closing-cash" {...regClose("closingCash", { required: true })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input data-testid="input-close-note" {...regClose("note")} placeholder="Catatan opsional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowClose(false)}>Batal</Button>
              <Button type="submit" variant="destructive" data-testid="button-confirm-close" disabled={closeShift.isPending}>Tutup Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
