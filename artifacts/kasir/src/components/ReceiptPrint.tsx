import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface ReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  discount?: number;
  subtotal: number;
}
interface ReceiptData {
  receiptNumber: string;
  createdAt: string;
  cashierName: string;
  customerName?: string | null;
  items: ReceiptItem[];
  discountAmount: number;
  taxAmount: number;
  taxRate?: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod?: string;
  note?: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtDate = (d: string) => new Date(d).toLocaleString("id-ID", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});

export function ReceiptPrint({ tx, storeName = "Kasir Enterprise", storeAddress = "" }: {
  tx: ReceiptData; storeName?: string; storeAddress?: string;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=420,height=700");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Struk ${tx.receiptNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm;color:#000}
.c{text-align:center}.b{font-weight:bold}.lg{font-size:14px}.xl{font-size:16px;font-weight:bold}
.div{border-top:1px dashed #000;margin:5px 0}.divs{border-top:2px solid #000;margin:5px 0}
.row{display:flex;justify-content:space-between;margin:2px 0}
.ind{padding-left:8px}
@media print{@page{margin:0;size:80mm auto}}
</style></head><body>${content}
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},1000)}<\/script>
</body></html>`);
    printWindow.document.close();
  };

  const itemsSubtotal = tx.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <>
      <div ref={receiptRef} style={{ display: "none" }}>
        <div className="xl c">{storeName}</div>
        {storeAddress && <div className="c">{storeAddress}</div>}
        <div className="divs" />
        <div className="row"><span>No. Struk</span><span className="b">{tx.receiptNumber}</span></div>
        <div className="row"><span>Tanggal</span><span>{fmtDate(tx.createdAt)}</span></div>
        <div className="row"><span>Kasir</span><span>{tx.cashierName}</span></div>
        {tx.customerName && <div className="row"><span>Pelanggan</span><span>{tx.customerName}</span></div>}
        <div className="div" />
        {tx.items.map((item, i) => (
          <div key={i} style={{marginBottom: "4px"}}>
            <div className="b">{item.productName}</div>
            <div className="row ind">
              <span>{item.quantity} x Rp {fmt(item.price)}</span>
              <span>Rp {fmt(item.subtotal)}</span>
            </div>
            {(item.discount ?? 0) > 0 && (
              <div className="row ind"><span>Diskon</span><span>-Rp {fmt(item.discount!)}</span></div>
            )}
          </div>
        ))}
        <div className="div" />
        <div className="row"><span>Subtotal</span><span>Rp {fmt(itemsSubtotal)}</span></div>
        {tx.discountAmount > 0 && (
          <div className="row"><span>Diskon</span><span>-Rp {fmt(tx.discountAmount)}</span></div>
        )}
        <div className="row"><span>PPN {tx.taxRate ?? 11}%</span><span>Rp {fmt(tx.taxAmount)}</span></div>
        <div className="divs" />
        <div className="row b lg"><span>TOTAL</span><span>Rp {fmt(tx.total)}</span></div>
        <div className="div" />
        <div className="row"><span>Metode</span><span>{tx.paymentMethod ?? "Tunai"}</span></div>
        <div className="row"><span>Bayar</span><span>Rp {fmt(tx.paidAmount)}</span></div>
        <div className="row"><span>Kembali</span><span>Rp {fmt(tx.changeAmount)}</span></div>
        {tx.note && <><div className="div" /><div>Catatan: {tx.note}</div></>}
        <div className="divs" />
        <div className="c">Terima kasih atas kunjungan Anda!</div>
        <div className="c" style={{fontSize:"10px", marginTop:"4px"}}>
          Barang yang sudah dibeli tidak dapat dikembalikan
        </div>
      </div>
      <Button className="w-full" variant="outline" onClick={handlePrint}>
        <Printer className="w-4 h-4 mr-2" /> Print Struk
      </Button>
    </>
  );
}
