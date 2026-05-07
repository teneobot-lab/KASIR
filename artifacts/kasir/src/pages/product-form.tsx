import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { useGetProduct, useCreateProduct, useUpdateProduct, useListCategories, useListSuppliers, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

export default function ProductForm() {
  const params = useParams<{ id: string }>();
  const id = params.id && params.id !== "new" ? parseInt(params.id, 10) : undefined;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: product } = useGetProduct(id!, { query: { enabled: !!id, queryKey: ["product", id] } });
  const { data: categories } = useListCategories();
  const { data: suppliers } = useListSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; sku: string; barcode: string; price: string; costPrice: string;
    memberPrice: string; stock: string; minStock: string; unit: string;
    categoryId: string; supplierId: string;
  }>({
    defaultValues: { name: "", sku: "", barcode: "", price: "", costPrice: "", memberPrice: "", stock: "0", minStock: "5", unit: "pcs", categoryId: "", supplierId: "" }
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name, sku: product.sku, barcode: product.barcode ?? "",
        price: String(product.price), costPrice: String(product.costPrice ?? ""),
        memberPrice: String(product.memberPrice ?? ""), stock: String(product.stock),
        minStock: String(product.minStock), unit: product.unit,
        categoryId: product.categoryId ? String(product.categoryId) : "",
        supplierId: product.supplierId ? String(product.supplierId) : "",
      });
    }
  }, [product, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      name: data.name, sku: data.sku, barcode: data.barcode || undefined,
      price: Number(data.price), costPrice: data.costPrice ? Number(data.costPrice) : undefined,
      memberPrice: data.memberPrice ? Number(data.memberPrice) : undefined,
      stock: Number(data.stock), minStock: Number(data.minStock), unit: data.unit,
      categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      supplierId: data.supplierId ? Number(data.supplierId) : undefined,
    };
    if (id) {
      updateProduct.mutate({ id, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Produk diperbarui" }); setLocation("/products"); },
        onError: () => toast({ title: "Gagal memperbarui produk", variant: "destructive" }),
      });
    } else {
      createProduct.mutate({ data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Produk ditambahkan" }); setLocation("/products"); },
        onError: () => toast({ title: "Gagal menambah produk", variant: "destructive" }),
      });
    }
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/products"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{id ? "Edit Produk" : "Tambah Produk"}</h1>
          <p className="text-muted-foreground text-sm">{id ? "Perbarui informasi produk" : "Tambahkan produk baru ke katalog"}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input id="name" data-testid="input-name" {...register("name", { required: true })} placeholder="Nama produk" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" data-testid="input-sku" {...register("sku", { required: true })} placeholder="SKU-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" data-testid="input-barcode" {...register("barcode")} placeholder="8999999..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((cat: any) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={watch("supplierId")} onValueChange={(v) => setValue("supplierId", v)}>
                  <SelectTrigger data-testid="select-supplier"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((sup: any) => <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Harga</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Harga Jual *</Label>
                <Input id="price" type="number" data-testid="input-price" {...register("price", { required: true })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Harga Modal</Label>
                <Input id="costPrice" type="number" data-testid="input-cost-price" {...register("costPrice")} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memberPrice">Harga Member</Label>
                <Input id="memberPrice" type="number" data-testid="input-member-price" {...register("memberPrice")} placeholder="0" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Stok</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stok Awal</Label>
                <Input id="stock" type="number" data-testid="input-stock" {...register("stock")} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input id="minStock" type="number" data-testid="input-min-stock" {...register("minStock")} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Satuan</Label>
                <Input id="unit" data-testid="input-unit" {...register("unit")} placeholder="pcs, botol, kg..." />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild><Link href="/products">Batal</Link></Button>
          <Button type="submit" data-testid="button-submit" disabled={isSubmitting || createProduct.isPending || updateProduct.isPending}>
            <Save className="w-4 h-4 mr-2" /> {id ? "Simpan Perubahan" : "Tambah Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
