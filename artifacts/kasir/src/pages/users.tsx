import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  cashier: "Kasir",
  warehouse: "Gudang",
  accountant: "Akuntan",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-blue-100 text-blue-700",
  cashier: "bg-green-100 text-green-700",
  warehouse: "bg-amber-100 text-amber-700",
  accountant: "bg-purple-100 text-purple-700",
};

type UserForm = { username: string; name: string; email: string; password: string; role: string };

export default function Users() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useListUsers({});
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, watch, setValue } = useForm<UserForm>({
    defaultValues: { username: "", name: "", email: "", password: "admin123", role: "cashier" }
  });

  const userList = (Array.isArray(users) ? users : []).filter((u: any) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditId(null); reset({ username: "", name: "", email: "", password: "admin123", role: "cashier" }); setShowForm(true); };
  const openEdit = (u: any) => { setEditId(u.id); reset({ username: u.username, name: u.name, email: u.email ?? "", password: "", role: u.role }); setShowForm(true); };

  const onSubmit = handleSubmit((data) => {
    if (editId) {
      updateUser.mutate({ id: editId, data: { name: data.name, email: data.email || undefined, role: data.role } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) }); toast({ title: "Pengguna diperbarui" }); setShowForm(false); },
      });
    } else {
      createUser.mutate({ data: { username: data.username, name: data.name, email: data.email || undefined, password: data.password, role: data.role } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) }); toast({ title: "Pengguna ditambahkan" }); setShowForm(false); },
        onError: () => toast({ title: "Gagal menambah pengguna", variant: "destructive" }),
      });
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Hapus pengguna ini?")) {
      deleteUser.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) }); toast({ title: "Pengguna dihapus" }); } });
    }
  };

  const handleToggle = (u: any) => {
    updateUser.mutate({ id: u.id, data: { isActive: !u.isActive } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground mt-1">Kelola akun pengguna dan hak akses.</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-user"><Plus className="w-4 h-4 mr-2" /> Tambah Pengguna</Button>
      </div>
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <Input placeholder="Cari nama atau username..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" data-testid="input-search-users" />
      </div>
      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
            ) : userList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <UserCog className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Belum ada pengguna.</p>
                </TableCell>
              </TableRow>
            ) : userList.map((u: any) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell><code className="text-sm bg-muted px-1.5 py-0.5 rounded">{u.username}</code></TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email ?? "-"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] ?? ""}`}>{roleLabels[u.role] ?? u.role}</span>
                </TableCell>
                <TableCell>
                  <Switch checked={u.isActive} onCheckedChange={() => handleToggle(u)} data-testid={`switch-user-${u.id}`} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} data-testid={`button-edit-${u.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} data-testid={`button-delete-${u.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {!editId && <div className="space-y-1.5"><Label>Username *</Label><Input data-testid="input-username" {...register("username", { required: !editId })} /></div>}
            <div className="space-y-1.5"><Label>Nama Lengkap *</Label><Input data-testid="input-name" {...register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register("email")} /></div>
            {!editId && <div className="space-y-1.5"><Label>Password *</Label><Input type="password" data-testid="input-password" {...register("password", { required: !editId })} /></div>}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v)}>
                <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cashier">Kasir</SelectItem>
                  <SelectItem value="warehouse">Gudang</SelectItem>
                  <SelectItem value="accountant">Akuntan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" data-testid="button-submit-user" disabled={createUser.isPending || updateUser.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
