import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Upload, Trash2, Store, MapPin, Phone } from "lucide-react";

const STORE_KEY = "kasir_store_settings";

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  qrisImageUrl: string;
  qrisNominalEnabled: boolean;
}

const defaultSettings: StoreSettings = {
  name: "Kasir Enterprise",
  address: "",
  phone: "",
  qrisImageUrl: "",
  qrisNominalEnabled: true,
};

function loadSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch { return defaultSettings; }
}

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(loadSettings);
  const [previewUrl, setPreviewUrl] = useState(settings.qrisImageUrl);

  const save = () => {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    toast({ title: "Pengaturan disimpan!" });
  };

  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setSettings(s => ({ ...s, qrisImageUrl: url }));
      setPreviewUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const removeQris = () => {
    setSettings(s => ({ ...s, qrisImageUrl: "" }));
    setPreviewUrl("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi toko dan QRIS pembayaran.</p>
      </div>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> Informasi Toko</CardTitle>
          <CardDescription>Ditampilkan di struk dan header aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama Toko</Label>
            <Input value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} placeholder="Nama toko Anda" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Alamat</Label>
            <Input value={settings.address} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} placeholder="Alamat toko" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> No. Telepon</Label>
            <Input value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} placeholder="08xx-xxxx-xxxx" />
          </div>
        </CardContent>
      </Card>

      {/* QRIS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" /> QRIS Pembayaran</CardTitle>
          <CardDescription>Upload QR code QRIS dari bank/dompet digital Anda. Akan ditampilkan saat pelanggan memilih metode QRIS di POS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewUrl ? (
            <div className="space-y-3">
              <div className="border rounded-xl p-4 bg-muted/30 flex flex-col items-center gap-3">
                <img src={previewUrl} alt="QRIS" className="max-w-[200px] max-h-[200px] object-contain rounded-lg" />
                <div className="text-sm text-muted-foreground font-medium">QRIS aktif ✓</div>
              </div>
              <div className="flex gap-2">
                <Label htmlFor="qris-upload" className="flex-1">
                  <Button variant="outline" className="w-full" asChild>
                    <span><Upload className="w-4 h-4 mr-2" /> Ganti QRIS</span>
                  </Button>
                </Label>
                <Button variant="destructive" size="icon" onClick={removeQris}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Label htmlFor="qris-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                <QrCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <div className="font-medium">Upload Gambar QRIS</div>
                <div className="text-sm text-muted-foreground mt-1">PNG, JPG, atau WEBP. Dari screenshot QRIS bank/e-wallet Anda.</div>
              </div>
            </Label>
          )}
          <input id="qris-upload" type="file" accept="image/*" className="hidden" onChange={handleQrisUpload} />
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full h-11 text-base">Simpan Pengaturan</Button>
    </div>
  );
}
