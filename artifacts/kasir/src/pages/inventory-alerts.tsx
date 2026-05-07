import { useGetLowStockAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

export default function InventoryAlerts() {
  const { data: alertsData, isLoading } = useGetLowStockAlerts();
  
  const alerts = Array.isArray(alertsData) ? alertsData : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          Low Stock Alerts
        </h1>
        <p className="text-muted-foreground mt-1">Products that have fallen below their minimum stock threshold.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted/50" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">All stock levels are healthy</h2>
          <p className="text-muted-foreground max-w-md">No products are currently below their minimum threshold.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => {
            const percentage = Math.max(0, Math.min(100, (alert.stock / alert.minStock) * 100));
            return (
              <Card key={alert.productId} className="border-destructive/30 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-destructive" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {alert.imageUrl ? (
                        <img src={alert.imageUrl} alt={alert.productName} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={alert.productName}>{alert.productName}</h3>
                      <p className="text-sm text-muted-foreground mb-4">SKU: {alert.sku}</p>
                      
                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-destructive">{alert.stock} {alert.unit} left</span>
                          <span className="text-muted-foreground">Min: {alert.minStock}</span>
                        </div>
                        <Progress value={percentage} className="h-2 bg-muted" />
                      </div>
                      
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href="/inventory">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Update Stock
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}