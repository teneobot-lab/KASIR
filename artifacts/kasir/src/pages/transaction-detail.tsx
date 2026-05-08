import { useGetTransaction, useVoidTransaction, getGetTransactionQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft, Printer, Ban, ReceiptText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptPrint } from "@/components/ReceiptPrint";
import { useQueryClient } from "@tanstack/react-query";

export default function TransactionDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tx, isLoading } = useGetTransaction(id, {
    query: { enabled: !!id, queryKey: getGetTransactionQueryKey(id) }
  });
  
  const voidMutation = useVoidTransaction();

  const handleVoid = () => {
    const reason = prompt("Enter reason for voiding this transaction:");
    if (reason) {
      voidMutation.mutate({ id, data: { reason } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(id) });
          toast({ title: "Transaction voided successfully" });
        }
      });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!tx) return <div className="p-8 text-center">Transaction not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/transactions"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Transaction {tx.receiptNumber}</h1>
          <p className="text-muted-foreground">{format(new Date(tx.createdAt), 'dd MMMM yyyy, HH:mm:ss')}</p>
        </div>
        <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'voided' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
          {tx.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-medium">Rp {item.subtotal.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.payments.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{p.method}</TableCell>
                      <TableCell className="text-right font-medium">Rp {p.amount.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {tx.subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-red-500">- Rp {tx.discountAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>Rp {tx.taxAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="pt-3 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rp {tx.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="pt-3 border-t flex justify-between">
                <span className="text-muted-foreground">Paid Amount</span>
                <span>Rp {tx.paidAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span>Rp {tx.changeAmount.toLocaleString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Customer</span>
                <span className="font-medium">{tx.customerName || 'Guest'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Cashier</span>
                <span className="font-medium">{tx.cashierName}</span>
              </div>
              {tx.note && (
                <div>
                  <span className="text-muted-foreground block text-xs">Note</span>
                  <span className="font-medium">{tx.note}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <ReceiptPrint
                tx={{
                  receiptNumber: tx.receiptNumber,
                  createdAt: tx.createdAt,
                  cashierName: tx.cashierName,
                  customerName: tx.customerName,
                  items: tx.items.map((i: any) => ({
                    productName: i.productName,
                    quantity: i.quantity,
                    price: i.price,
                    discount: i.discount,
                    subtotal: i.subtotal,
                  })),
                  discountAmount: tx.discountAmount,
                  taxAmount: tx.taxAmount,
                  total: tx.total,
                  paidAmount: tx.paidAmount,
                  changeAmount: tx.changeAmount,
                  paymentMethod: tx.payments?.[0]?.method,
                  note: tx.note,
                }}
                storeName={JSON.parse(localStorage.getItem("kasir_store_settings") || "{}").name || "Kasir Enterprise"}
                storeAddress={JSON.parse(localStorage.getItem("kasir_store_settings") || "{}").address || ""}
              />
              {tx.status === 'completed' && (
                <Button className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" variant="ghost" onClick={handleVoid} disabled={voidMutation.isPending}>
                  <Ban className="w-4 h-4 mr-2" /> Void Transaction
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}