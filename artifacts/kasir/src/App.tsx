import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Pos from "@/pages/pos";
import Products from "@/pages/products";
import ProductForm from "@/pages/product-form";
import Categories from "@/pages/categories";
import Inventory from "@/pages/inventory";
import InventoryAlerts from "@/pages/inventory-alerts";
import Transactions from "@/pages/transactions";
import TransactionDetail from "@/pages/transaction-detail";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import Shifts from "@/pages/shifts";
import Discounts from "@/pages/discounts";
import Suppliers from "@/pages/suppliers";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import HR from "@/pages/hr";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <RequireAuth>
      <Layout>
        <Component />
      </Layout>
    </RequireAuth>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/">{() => { window.location.href = "/dashboard"; return null; }}</Route>
            <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
            <Route path="/pos">{() => <ProtectedRoute component={Pos} />}</Route>
            <Route path="/products">{() => <ProtectedRoute component={Products} />}</Route>
            <Route path="/products/new">{() => <ProtectedRoute component={ProductForm} />}</Route>
            <Route path="/products/:id">{() => <ProtectedRoute component={ProductForm} />}</Route>
            <Route path="/categories">{() => <ProtectedRoute component={Categories} />}</Route>
            <Route path="/inventory">{() => <ProtectedRoute component={Inventory} />}</Route>
            <Route path="/inventory/alerts">{() => <ProtectedRoute component={InventoryAlerts} />}</Route>
            <Route path="/transactions">{() => <ProtectedRoute component={Transactions} />}</Route>
            <Route path="/transactions/:id">{() => <ProtectedRoute component={TransactionDetail} />}</Route>
            <Route path="/customers">{() => <ProtectedRoute component={Customers} />}</Route>
            <Route path="/customers/:id">{() => <ProtectedRoute component={CustomerDetail} />}</Route>
            <Route path="/shifts">{() => <ProtectedRoute component={Shifts} />}</Route>
            <Route path="/discounts">{() => <ProtectedRoute component={Discounts} />}</Route>
            <Route path="/suppliers">{() => <ProtectedRoute component={Suppliers} />}</Route>
            <Route path="/reports">{() => <ProtectedRoute component={Reports} />}</Route>
            <Route path="/users">{() => <ProtectedRoute component={Users} />}</Route>
            <Route path="/hr">{() => <ProtectedRoute component={HR} />}</Route>
            <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
            <Route component={NotFound} />
          </Switch>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
