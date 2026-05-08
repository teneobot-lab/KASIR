import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, CalendarDays, FileText, Wallet, Plus, Edit, CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const API = "https://kasir.invengudang.my.id/api/hr";
const token = () => localStorage.getItem("kasir_token") ?? "";
const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const thisMonth = () => format(new Date(), "yyyy-MM");

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  sick: "bg-blue-100 text-blue-700",
  leave: "bg-purple-100 text-purple-700",
};
const statusLabel: Record<string, string> = {
  present: "Hadir", absent: "Absen", late: "Terlambat", sick: "Sakit", leave: "Cuti",
};
const leaveStatusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Hooks ──
const useEmployees = () => useQuery({ queryKey: ["hr-employees"], queryFn: () => apiFetch("/employees") });
const useAttendance = (month: string) => useQuery({ queryKey: ["hr-attendance", month], queryFn: () => apiFetch(`/attendance?month=${month}`) });
const useLeaves = (status?: string) => useQuery({ queryKey: ["hr-leaves", status], queryFn: () => apiFetch(`/leaves${status ? `?status=${status}` : ""}`) });
const useSalary = (period: string) => useQuery({ queryKey: ["hr-salary", period], queryFn: () => apiFetch(`/salary?period=${period}`) });

export default function HR() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [salaryPeriod, setSalaryPeriod] = useState(thisMonth());

  // Employee profile dialog
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ position: "", department: "", baseSalary: "", salaryType: "monthly", joinDate: "", phone: "", address: "", emergencyContact: "", notes: "" });

  // Attendance dialog
  const [showAtt, setShowAtt] = useState(false);
  const [attForm, setAttForm] = useState({ userId: "", date: format(new Date(), "yyyy-MM-dd"), checkIn: "08:00", checkOut: "17:00", status: "present", note: "" });

  // Leave dialog
  const [showLeave, setShowLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ userId: "", startDate: "", endDate: "", reason: "" });

  // Salary edit dialog
  const [showSalaryEdit, setShowSalaryEdit] = useState(false);
  const [salaryEdit, setSalaryEdit] = useState<any>(null);
  const [salaryForm, setSalaryForm] = useState({ bonus: "0", deduction: "0", note: "", status: "draft" });

  const { data: employees = [], isLoading: loadEmp } = useEmployees();
  const { data: attendance = [], isLoading: loadAtt } = useAttendance(month);
  const { data: leaves = [], isLoading: loadLeave } = useLeaves();
  const { data: salaries = [], isLoading: loadSalary } = useSalary(salaryPeriod);

  // Mutations
  const saveProfile = useMutation({
    mutationFn: (d: any) => apiFetch(`/employees/${d.userId}/profile`, { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); toast({ title: "Profil disimpan" }); setShowProfile(false); },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
  });

  const saveAtt = useMutation({
    mutationFn: (d: any) => apiFetch("/attendance", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance"] }); toast({ title: "Absensi disimpan" }); setShowAtt(false); },
    onError: () => toast({ title: "Gagal menyimpan absensi", variant: "destructive" }),
  });

  const saveLeave = useMutation({
    mutationFn: (d: any) => apiFetch("/leaves", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-leaves"] }); toast({ title: "Permohonan cuti diajukan" }); setShowLeave(false); },
    onError: () => toast({ title: "Gagal mengajukan cuti", variant: "destructive" }),
  });

  const updateLeave = useMutation({
    mutationFn: ({ id, status }: any) => apiFetch(`/leaves/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-leaves"] }); toast({ title: "Status cuti diperbarui" }); },
  });

  const generateSalary = useMutation({
    mutationFn: () => apiFetch("/salary/generate", { method: "POST", body: JSON.stringify({ period: salaryPeriod }) }),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["hr-salary"] }); toast({ title: `${d.generated} slip gaji dibuat` }); },
    onError: () => toast({ title: "Gagal generate gaji", variant: "destructive" }),
  });

  const updateSalary = useMutation({
    mutationFn: ({ id, ...d }: any) => apiFetch(`/salary/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-salary"] }); toast({ title: "Slip gaji diperbarui" }); setShowSalaryEdit(false); },
    onError: () => toast({ title: "Gagal memperbarui", variant: "destructive" }),
  });

  const openProfile = (emp: any) => {
    setProfileUser(emp);
    setProfileForm({
      position: emp.position ?? "", department: emp.department ?? "",
      baseSalary: emp.base_salary ?? "0", salaryType: emp.salary_type ?? "monthly",
      joinDate: emp.join_date ?? "", phone: emp.phone ?? "",
      address: emp.address ?? "", emergencyContact: emp.emergency_contact ?? "",
      notes: emp.notes ?? "",
    });
    setShowProfile(true);
  };

  const openSalaryEdit = (s: any) => {
    setSalaryEdit(s);
    setSalaryForm({ bonus: s.bonus ?? "0", deduction: s.deduction ?? "0", note: s.note ?? "", status: s.status });
    setShowSalaryEdit(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Karyawan</h1>
        <p className="text-muted-foreground mt-1">Kelola data karyawan, absensi, cuti, dan penggajian.</p>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="employees"><Users className="w-4 h-4 mr-1" />Karyawan</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarDays className="w-4 h-4 mr-1" />Absensi</TabsTrigger>
          <TabsTrigger value="leaves"><FileText className="w-4 h-4 mr-1" />Cuti</TabsTrigger>
          <TabsTrigger value="salary"><Wallet className="w-4 h-4 mr-1" />Gaji</TabsTrigger>
        </TabsList>

        {/* ── KARYAWAN ── */}
        <TabsContent value="employees" className="mt-4">
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Tgl Bergabung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadEmp ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (employees as any[]).map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{emp.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">@{emp.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.position ?? <span className="text-muted-foreground italic text-xs">-</span>}</TableCell>
                    <TableCell>{emp.department ?? <span className="text-muted-foreground italic text-xs">-</span>}</TableCell>
                    <TableCell>{emp.base_salary ? fmt(Number(emp.base_salary)) : <span className="text-muted-foreground italic text-xs">Belum diset</span>}</TableCell>
                    <TableCell className="text-sm">{emp.join_date ? format(new Date(emp.join_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell><Badge variant={emp.is_active ? "default" : "secondary"}>{emp.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openProfile(emp)}><Edit className="w-4 h-4 mr-1" />Edit Profil</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── ABSENSI ── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
            <Button onClick={() => setShowAtt(true)}><Plus className="w-4 h-4 mr-2" />Input Absensi</Button>
          </div>
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadAtt ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (attendance as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data absensi bulan ini</TableCell></TableRow>
                ) : (attendance as any[]).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.user_name}</TableCell>
                    <TableCell>{format(new Date(a.date), "dd MMM yyyy", { locale: idLocale })}</TableCell>
                    <TableCell>{a.check_in ?? "-"}</TableCell>
                    <TableCell>{a.check_out ?? "-"}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] ?? ""}`}>{statusLabel[a.status] ?? a.status}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.note ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── CUTI ── */}
        <TabsContent value="leaves" className="mt-4 space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Permohonan Cuti</h2>
            <Button onClick={() => setShowLeave(true)}><Plus className="w-4 h-4 mr-2" />Ajukan Cuti</Button>
          </div>
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadLeave ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (leaves as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada permohonan cuti</TableCell></TableRow>
                ) : (leaves as any[]).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.user_name}</TableCell>
                    <TableCell>{format(new Date(l.start_date), "dd MMM yyyy", { locale: idLocale })}</TableCell>
                    <TableCell>{format(new Date(l.end_date), "dd MMM yyyy", { locale: idLocale })}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{l.reason}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${leaveStatusColor[l.status] ?? ""}`}>{l.status}</span></TableCell>
                    <TableCell className="text-right">
                      {l.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-green-600 h-8 w-8" onClick={() => updateLeave.mutate({ id: l.id, status: "approved" })}><CheckCircle className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => updateLeave.mutate({ id: l.id, status: "rejected" })}><XCircle className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── GAJI ── */}
        <TabsContent value="salary" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Input type="month" value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value)} className="w-48" />
            <Button onClick={() => generateSalary.mutate()} disabled={generateSalary.isPending}>
              {generateSalary.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Generate Slip Gaji
            </Button>
          </div>
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="text-right">Gaji Pokok</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Potongan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadSalary ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (salaries as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada data gaji. Klik "Generate Slip Gaji" untuk membuat.</TableCell></TableRow>
                ) : (salaries as any[]).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.user_name}</TableCell>
                    <TableCell className="text-right">{fmt(Number(s.base_salary))}</TableCell>
                    <TableCell className="text-right text-green-600">+{fmt(Number(s.bonus))}</TableCell>
                    <TableCell className="text-right text-red-500">-{fmt(Number(s.deduction))}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(Number(s.net_salary))}</TableCell>
                    <TableCell><span className="text-sm">{s.total_days_present}h / {s.total_days_absent}a</span></TableCell>
                    <TableCell>
                      <Badge variant={s.status === "paid" ? "default" : "secondary"}>
                        {s.status === "paid" ? "Dibayar" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openSalaryEdit(s)}><Edit className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Edit Profil Karyawan ── */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Profil Karyawan — {profileUser?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Jabatan</Label><Input value={profileForm.position} onChange={e => setProfileForm(p => ({...p, position: e.target.value}))} /></div>
            <div className="space-y-1"><Label className="text-xs">Departemen</Label><Input value={profileForm.department} onChange={e => setProfileForm(p => ({...p, department: e.target.value}))} /></div>
            <div className="space-y-1"><Label className="text-xs">Gaji Pokok (Rp)</Label><Input type="number" value={profileForm.baseSalary} onChange={e => setProfileForm(p => ({...p, baseSalary: e.target.value}))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Tipe Gaji</Label>
              <Select value={profileForm.salaryType} onValueChange={v => setProfileForm(p => ({...p, salaryType: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="daily">Harian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Tanggal Bergabung</Label><Input type="date" value={profileForm.joinDate} onChange={e => setProfileForm(p => ({...p, joinDate: e.target.value}))} /></div>
            <div className="space-y-1"><Label className="text-xs">No. Telepon</Label><Input value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Alamat</Label><Input value={profileForm.address} onChange={e => setProfileForm(p => ({...p, address: e.target.value}))} /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Kontak Darurat</Label><Input value={profileForm.emergencyContact} onChange={e => setProfileForm(p => ({...p, emergencyContact: e.target.value}))} /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Catatan</Label><Input value={profileForm.notes} onChange={e => setProfileForm(p => ({...p, notes: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfile(false)}>Batal</Button>
            <Button onClick={() => saveProfile.mutate({ userId: profileUser?.id, ...profileForm, baseSalary: Number(profileForm.baseSalary) })} disabled={saveProfile.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Input Absensi ── */}
      <Dialog open={showAtt} onOpenChange={setShowAtt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Input Absensi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Karyawan</Label>
              <Select value={attForm.userId} onValueChange={v => setAttForm(p => ({...p, userId: v}))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>{(employees as any[]).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tanggal</Label><Input type="date" value={attForm.date} onChange={e => setAttForm(p => ({...p, date: e.target.value}))} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={attForm.status} onValueChange={v => setAttForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Hadir</SelectItem>
                    <SelectItem value="late">Terlambat</SelectItem>
                    <SelectItem value="absent">Absen</SelectItem>
                    <SelectItem value="sick">Sakit</SelectItem>
                    <SelectItem value="leave">Cuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Check In</Label><Input type="time" value={attForm.checkIn} onChange={e => setAttForm(p => ({...p, checkIn: e.target.value}))} /></div>
              <div className="space-y-1"><Label className="text-xs">Check Out</Label><Input type="time" value={attForm.checkOut} onChange={e => setAttForm(p => ({...p, checkOut: e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Catatan</Label><Input value={attForm.note} onChange={e => setAttForm(p => ({...p, note: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAtt(false)}>Batal</Button>
            <Button onClick={() => saveAtt.mutate({ ...attForm, userId: Number(attForm.userId) })} disabled={saveAtt.isPending || !attForm.userId}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Ajukan Cuti ── */}
      <Dialog open={showLeave} onOpenChange={setShowLeave}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajukan Cuti</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Karyawan</Label>
              <Select value={leaveForm.userId} onValueChange={v => setLeaveForm(p => ({...p, userId: v}))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>{(employees as any[]).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Tanggal Mulai</Label><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(p => ({...p, startDate: e.target.value}))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tanggal Selesai</Label><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(p => ({...p, endDate: e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Alasan</Label><Input value={leaveForm.reason} onChange={e => setLeaveForm(p => ({...p, reason: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeave(false)}>Batal</Button>
            <Button onClick={() => saveLeave.mutate({ ...leaveForm, userId: Number(leaveForm.userId) })} disabled={saveLeave.isPending || !leaveForm.userId}>Ajukan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Slip Gaji ── */}
      <Dialog open={showSalaryEdit} onOpenChange={setShowSalaryEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Slip Gaji — {salaryEdit?.user_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Bonus (Rp)</Label><Input type="number" value={salaryForm.bonus} onChange={e => setSalaryForm(p => ({...p, bonus: e.target.value}))} /></div>
              <div className="space-y-1"><Label className="text-xs">Potongan (Rp)</Label><Input type="number" value={salaryForm.deduction} onChange={e => setSalaryForm(p => ({...p, deduction: e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Catatan</Label><Input value={salaryForm.note} onChange={e => setSalaryForm(p => ({...p, note: e.target.value}))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={salaryForm.status} onValueChange={v => setSalaryForm(p => ({...p, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paid">Dibayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {salaryEdit && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Gaji Pokok</span><span>{fmt(Number(salaryEdit.base_salary))}</span></div>
                <div className="flex justify-between text-green-600"><span>+ Bonus</span><span>{fmt(Number(salaryForm.bonus))}</span></div>
                <div className="flex justify-between text-red-500"><span>- Potongan</span><span>{fmt(Number(salaryForm.deduction))}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{fmt(Number(salaryEdit.base_salary) + Number(salaryForm.bonus) - Number(salaryForm.deduction))}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalaryEdit(false)}>Batal</Button>
            <Button onClick={() => updateSalary.mutate({ id: salaryEdit.id, bonus: Number(salaryForm.bonus), deduction: Number(salaryForm.deduction), note: salaryForm.note, status: salaryForm.status })} disabled={updateSalary.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
