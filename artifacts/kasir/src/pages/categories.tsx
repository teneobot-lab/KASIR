import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  const handleOpenDialog = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setName(cat.name);
      setColor(cat.color || "");
    } else {
      setEditingId(null);
      setName("");
      setColor("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name) return;
    if (editingId) {
      updateCategory.mutate({ id: editingId, data: { name, color } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Category updated" });
        }
      });
    } else {
      createCategory.mutate({ data: { name, color } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setIsDialogOpen(false);
          toast({ title: "Category created" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategory.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: "Category deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage product categories.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beverages" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. #ff0000" />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!name || createCategory.isPending || updateCategory.isPending}>
              Save Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : categories?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">No categories found.</TableCell></TableRow>
            ) : (
              categories?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cat.color && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />}
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell>{cat.color || "-"}</TableCell>
                  <TableCell className="text-right">{cat.productCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
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