import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("kasir_token", data.token);
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: (error as any)?.data?.error || "Periksa username dan password Anda.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 bg-sidebar flex-col justify-between p-12 text-sidebar-foreground">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="font-bold text-2xl tracking-tight">Sistem Kasir<br/>Enterprise</h1>
          </div>
          <h2 className="text-4xl font-semibold leading-tight mb-6">
            The fast, reliable POS system for serious business operators.
          </h2>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Manage your sales, inventory, and team from a single, powerful cockpit. 
            Built for speed and scale.
          </p>
        </div>
        <div className="text-sidebar-foreground/50 text-sm">
          &copy; {new Date().getFullYear()} Sistem Kasir Enterprise. All rights reserved.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                <Store className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Enter your credentials to access the system</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={loginMutation.isPending}
                data-testid="btn-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1 text-foreground">Demo Accounts:</p>
            <ul className="space-y-1 list-disc list-inside ml-4">
              <li>Super Admin: <code className="bg-background px-1 py-0.5 rounded">admin</code> / <code className="bg-background px-1 py-0.5 rounded">admin123</code></li>
              <li>Cashier: <code className="bg-background px-1 py-0.5 rounded">cashier1</code> / <code className="bg-background px-1 py-0.5 rounded">cashier123</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
