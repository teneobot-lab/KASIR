import { useState, useCallback } from "react";
import {
  useListProducts,
  useListCustomers,
  useGetActiveShift,
  useCreateTransaction,
  getListTransactionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, ShoppingCart, Loader2, Plus, Minus, Trash2,
  Tag, User, CreditCard, Banknote, CheckCircle2, AlertTriangle,
} from "lucide-react";

interface CartItem {
  productId: number; name: string; sku: string;
  price: number; quantity: number; stock: number; discount: number;
}
const TAX_RATE = 11;
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function Pos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [cashPaid, setCashPaid] = useState<string>("");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string>("");
  const [lastChange, setLastChange] = useState(0);

  const { data: productsData, isLoading: loadingProducts } = useListProducts({ search: search || undefined, limit: 60, isActive: true } as any);
  const { data: customersData } = useListCustomers({ limit: 200 } as any);
  const { data: activeShiftData } = useGetActiveShift();
  const createTransaction = useCreateTransaction();

  const products = (productsData as any)?.data ?? [];
  const customers = Array.isArray(customersData) ? customersData : (customersData as any)?.data ?? [];
  const activeShift = (activeShiftData as any)?.shift ?? null;

  const addToCart = useCallback((product: any) => {
    if (product.stock <= 0) { toast({ title: "Stok habis", variant: "destructive" }); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast({ title: "Stok tidak mencukupi", variant: "destructive" }); return prev; }
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, sku: product.sku ?? "", price: Number(product.price), quantity: 1, stock: product.stock, discount: 0 }];
    });
  }, [toast]);

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty > i.stock) { toast({ title: "Stok tidak mencukupi", variant: "destructive" }); return i; }
      return { ...i, quantity: Math.max(0, newQty) };
    }).filter((i) => i.quantity > 0));
  };

  const removeFromCart = (productId: number) => setCart((prev) => prev.filter((i) => i.productId !== productId));
  const updateItemDiscount = (productId: number, val: string) => {
    const num = Number(val.replace(/\D/g, "")) || 0;
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, discount: num } : i));
  };

  const clearCart = () => { setCart([]); setDiscountAmount(0); setSelectedCustomerId(null); setCashPaid(""); setPaymentMethod("cash"); };

  const itemsSubtotal = cart.reduce((s, i) => s + i.price * i.quantity - i.discount, 0);
  const subtotal = Math.max(0, itemsSubtotal - discountAmount);
  const taxAmount = Math.round(subtotal * (TAX_RATE / 100));
  const total = subtotal + taxAmount;
  const cashPaidNum = Number(cashPaid.replace(/\D/g, "")) || 0;
  const change = paymentMethod === "cash" ? cashPaidNum - total : 0;

  const handleCharge = () => {
    if (cart.length === 0) return;
    if (!activeShift) { toast({ title: "Shift belum dibuka!", variant: "destructive" }); return; }
    if (paymentMethod === "cash" && cashPaidNum < total) { toast({ title: "Uang bayar kurang", variant: "destructive" }); return; }
    setShowPayDialog(true);
  };

  const confirmPayment = () => {
    const payments = paymentMethod === "cash" ? [{ method: "cash", amount: cashPaidNum }] : [{ method: paymentMethod, amount: total }];
    createTransaction.mutate({ data: { customerId: selectedCustomerId ?? undefined, shiftId: activeShift?.id, taxRate: TAX_RATE, discountAmount, items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, discount: i.discount })), payments } } as any, {
      onSuccess: (res: any) => {
        setLastReceipt(res?.receiptNumber ?? "");
        setLastChange(change);
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({}) });
        setShowPayDialog(false);
        setShowSuccessDialog(true);
        clearCart();
      },
      onError: (err: any) => toast({ title: "Transaksi gagal", description: err?.data?.error ?? "Terjadi kesalahan", variant: "destructive" }),
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 -m-4 p-4">
      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari produk (nama / SKU / barcode)..." className="pl-9 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {!activeShift && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Shift belum dibuka. Buka shift kasir terlebih dahulu.
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingProducts ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Produk tidak ditemukan</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((p: any) => {
                const inCart = cart.find((c) => c.productId === p.id);
                const outOfStock = p.stock <= 0;
                return (
                  <Card key={p.id} onClick={() => !outOfStock && addToCart(p)} className={`cursor-pointer transition-all select-none ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:border-primary hover:shadow-md active:scale-95"} ${inCart ? "border-primary ring-1 ring-primary" : ""}`}>
                    <CardContent className="p-3">
                      <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-2xl">🛍️</span>}
                      </div>
                      <div className="font-medium text-xs line-clamp-2 min-h-[2rem] leading-tight">{p.name}</div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">{fmt(Number(p.price))}</span>
                        <Badge variant={p.stock > 5 ? "secondary" : "destructive"} className="text-[10px] px-1">{p.stock}</Badge>
                      </div>
                      {inCart && <div className="mt-1 text-[10px] text-primary font-semibold text-center bg-primary/10 rounded px-1">× {inCart.quantity} di keranjang</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-96 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <ShoppingCart className="w-4 h-4" /> Keranjang
            {cart.length > 0 && <Badge variant="secondary">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>}
          </h2>
          {cart.length > 0 && <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs" onClick={clearCart}>Kosongkan</Button>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <ShoppingCart className="w-10 h-10 opacity-20" /> Keranjang kosong
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.productId} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{fmt(item.price)}/pcs</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeFromCart(item.productId)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}><Plus className="h-3 w-3" /></Button>
                    <span className="ml-auto text-sm font-semibold">{fmt(item.price * item.quantity - item.discount)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <Input placeholder="Diskon item (Rp)" className="h-6 text-xs px-2" value={item.discount > 0 ? item.discount.toString() : ""} onChange={(e) => updateItemDiscount(item.productId, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t bg-muted/10 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedCustomerId?.toString() ?? "none"} onValueChange={(v) => setSelectedCustomerId(v === "none" ? null : Number(v))}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Pilih pelanggan (opsional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tanpa pelanggan —</SelectItem>
                {customers.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input placeholder="Diskon transaksi (Rp)" className="h-8 text-xs flex-1" value={discountAmount > 0 ? discountAmount.toString() : ""} onChange={(e) => setDiscountAmount(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </div>
          <div className="space-y-1 text-xs border-t pt-2">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(itemsSubtotal)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Diskon</span><span>- {fmt(discountAmount)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>PPN {TAX_RATE}%</span><span>{fmt(taxAmount)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
          </div>
          <Button className="w-full h-11 text-base font-bold" disabled={cart.length === 0 || !activeShift} onClick={handleCharge}>
            Bayar {cart.length > 0 ? fmt(total) : ""}
          </Button>
        </div>
      </div>

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Pembayaran</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Total Tagihan</div>
              <div className="text-3xl font-bold text-primary">{fmt(total)}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Metode Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "transfer", "qris"] as const).map((m) => (
                  <Button key={m} variant={paymentMethod === m ? "default" : "outline"} className="h-9 text-xs" onClick={() => setPaymentMethod(m)}>
                    {m === "cash" ? <Banknote className="h-3 w-3 mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
                    {m === "cash" ? "Tunai" : m === "transfer" ? "Transfer" : "QRIS"}
                  </Button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Uang Diterima</Label>
                <Input placeholder="Masukkan nominal..." className="text-lg font-bold h-12 text-center" value={cashPaid} onChange={(e) => setCashPaid(e.target.value.replace(/\D/g, ""))} autoFocus />
                <div className="grid grid-cols-3 gap-1.5">
                  {[total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000].map((v, idx) => (
                    <Button key={idx} variant="outline" size="sm" className="text-xs h-8" onClick={() => setCashPaid(v.toString())}>{fmt(v)}</Button>
                  ))}
                </div>
                {cashPaidNum >= total && (
                  <div className="flex justify-between text-sm font-semibold bg-green-50 border border-green-200 rounded p-2">
                    <span className="text-green-700">Kembalian</span>
                    <span className="text-green-700">{fmt(change)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Batal</Button>
            <Button onClick={confirmPayment} disabled={createTransaction.isPending || (paymentMethod === "cash" && cashPaidNum < total)}>
              {createTransaction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold">Transaksi Berhasil!</h2>
            {lastReceipt && <p className="text-sm text-muted-foreground">No. Struk: <span className="font-mono font-bold">{lastReceipt}</span></p>}
            {paymentMethod === "cash" && lastChange > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3">
                <div className="text-sm text-green-700">Kembalian</div>
                <div className="text-2xl font-bold text-green-700">{fmt(lastChange)}</div>
              </div>
            )}
          </div>
          <DialogFooter><Button className="w-full" onClick={() => setShowSuccessDialog(false)}>Transaksi Baru</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
