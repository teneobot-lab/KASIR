import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  ListOrdered, 
  AlertTriangle,
  Receipt,
  Users,
  Clock,
  Percent,
  Truck,
  BarChart3,
  UserCog,
  LogOut,
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/inventory", label: "Inventory", icon: ListOrdered },
  { href: "/inventory/alerts", label: "Low Stock", icon: AlertTriangle },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/shifts", label: "Shifts", icon: Clock },
  { href: "/discounts", label: "Discounts", icon: Percent },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: UserCog },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Kasir Enterprise</h1>
            <p className="text-xs text-sidebar-foreground/60">POS System</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => logout()}
            data-testid="btn-logout"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
