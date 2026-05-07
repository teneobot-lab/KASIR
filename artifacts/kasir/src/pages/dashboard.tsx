import { 
  useGetDashboard 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  DollarSign, 
  Users, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  AlertTriangle
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store's performance today.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store's performance today.</p>
        </div>
        {dashboard.activeShifts > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
            <Clock className="w-3 h-3 mr-2" />
            {dashboard.activeShifts} Active Shift{dashboard.activeShifts > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {dashboard.revenueGrowth >= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />+{dashboard.revenueGrowth.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{dashboard.revenueGrowth.toFixed(1)}%</span>
              )}
              <span className="ml-1">from yesterday</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.todayTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {dashboard.transactionGrowth >= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />+{dashboard.transactionGrowth.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{dashboard.transactionGrowth.toFixed(1)}%</span>
              )}
              <span className="ml-1">from yesterday</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.todayCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique customers today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className={dashboard.lowStockCount > 0 ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Items below minimum stock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-8">
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Hourly Sales Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboard.hourlySalesToday}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(val) => `${val}:00`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tickFormatter={(val) => `Rp ${val / 1000}k`}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3 lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboard.topProductsToday.length > 0 ? (
                dashboard.topProductsToday.slice(0, 5).map((product, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center mr-4 shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.productName} className="w-10 h-10 object-cover rounded-md" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.quantitySold} sold</p>
                    </div>
                    <div className="font-medium text-sm whitespace-nowrap ml-4">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No products sold today yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
