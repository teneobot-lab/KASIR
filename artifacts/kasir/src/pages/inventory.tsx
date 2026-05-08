import { useState } from "react";
import { useListInventory, useListStockMovements, useCreateStockMovement, getListStockMovementsQueryKey, getListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: inventoryData, isLoading: isLoadingInventory } = useListInventory({ search: searchTerm });
  const { data: movementsData, isLoading: isLoadingMovements } = useListStockMovements({ limit: 50 } as any);
  const createMovement = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    productId: "",
    type: "adjustment",
    quantity: "",
    note: ""
  });

  const inventory = Array.isArray(inventoryData) ? inventoryData : [];
  const movements = Array.isArray(movementsData) ? movementsData : [];

  const handleCreateMovement = () => {
    if (!movementForm.productId || !movementForm.quantity) return;
    
    createMovement.mutate({
      data: {
        productId: Number(movementForm.productId),
        type: movementForm.type as any,
        quantity: Number(movementForm.quantity),
        note: movementForm.note
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey({ search: "" }) });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        setIsDialogOpen(false);
        setMovementForm({ productId: "", type: "adjustment", quantity: "", note: "" });
        toast({ title: "Stock movement recorded" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock levels and track movements.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Stock Movement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Stock Movement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product</label>
                <Select value={movementForm.productId} onValueChange={(val) => setMovementForm({ ...movementForm, productId: val })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {inventory.map(item => (
                      <SelectItem key={item.productId} value={item.productId.toString()}>{item.productName} ({item.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={movementForm.type} onValueChange={(val) => setMovementForm({ ...movementForm, type: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase (In)</SelectItem>
                      <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                      <SelectItem value="return">Return (In)</SelectItem>
                      <SelectItem value="transfer">Transfer (Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    value={movementForm.quantity} 
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} 
                    placeholder="e.g. 10 or -5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (Optional)</label>
                <Input 
                  value={movementForm.note} 
                  onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} 
                  placeholder="Reason for movement"
                />
              </div>
              <Button 
                onClick={handleCreateMovement} 
                className="w-full" 
                disabled={!movementForm.productId || !movementForm.quantity || createMovement.isPending}
              >
                Save Movement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="levels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">History & Movements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="levels" className="space-y-4">
          <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search inventory..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInventory ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">No inventory items found.</TableCell></TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.productId} className={item.isLowStock ? "bg-destructive/5 hover:bg-destructive/10" : ""}>
                      <TableCell className="font-medium">
                        {item.productName}
                        {item.isLowStock && <AlertTriangle className="inline-block ml-2 w-4 h-4 text-destructive" />}
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className={`text-right font-bold ${item.isLowStock ? "text-destructive" : ""}`}>
                        {item.stock} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isLowStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="movements">
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovements ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : movements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">No movements found.</TableCell></TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.createdAt), 'dd MMM yyyy, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{movement.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{movement.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.quantity > 0 ? (
                          <span className="text-green-600 flex items-center justify-end"><ArrowUpRight className="w-3 h-3 mr-1"/>+{movement.quantity}</span>
                        ) : (
                          <span className="text-destructive flex items-center justify-end"><ArrowDownRight className="w-3 h-3 mr-1"/>{movement.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{movement.after}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {movement.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}