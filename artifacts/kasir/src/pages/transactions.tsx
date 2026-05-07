import { useState } from "react";
import { useListTransactions } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Filter } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: transactionsData, isLoading } = useListTransactions({
    limit: 50,
  });

  const transactions = transactionsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and manage sales history.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search receipt number..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No transactions found.</TableCell></TableRow>
            ) : (
              transactions.filter(t => !searchTerm || t.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium font-mono">{tx.receiptNumber}</TableCell>
                  <TableCell>{format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm')}</TableCell>
                  <TableCell>{tx.customerName || <span className="text-muted-foreground italic">Guest</span>}</TableCell>
                  <TableCell>{tx.cashierName}</TableCell>
                  <TableCell className="text-right font-bold">Rp {tx.total.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={
                      tx.status === 'completed' ? 'default' : 
                      tx.status === 'voided' ? 'destructive' : 'secondary'
                    }>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/transactions/${tx.id}`}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}