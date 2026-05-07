import { useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Pos() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: productsData, isLoading } = useListProducts({
    search: searchTerm || undefined,
    limit: 50,
  });

  const products = productsData?.data || [];

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6 -m-4 p-4">
      {/* Left side - Products */}
      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products by name, SKU, or barcode..." 
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground/50 text-xs">No Image</div>
                      )}
                    </div>
                    <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem] leading-tight">
                      {product.name}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="w-96 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Current Order
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-muted-foreground text-sm">
          Cart is empty
        </div>
        
        <div className="p-4 border-t bg-muted/10 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rp 0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (11%)</span>
            <span>Rp 0</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span className="text-primary">Rp 0</span>
          </div>
          <Button className="w-full h-12 text-lg font-bold" disabled>
            Charge Rp 0
          </Button>
        </div>
      </div>
    </div>
  );
}
