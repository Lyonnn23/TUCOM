import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, MessageSquarePlus, X, ShieldCheck } from "lucide-react";
import { useReportPrice } from "@/hooks/useReportPrice";
import { useAuth } from "@/hooks/useAuth";
import type { GasStation } from "@/hooks/useGasStations";

interface ReportPriceDialogProps {
  station: GasStation;
}

const FUEL_OPTIONS = [
  { value: "gasoline93", label: "Bencina 93", unit: "CLP/L" },
  { value: "gasoline95", label: "Bencina 95", unit: "CLP/L" },
  { value: "gasoline97", label: "Bencina 97", unit: "CLP/L" },
  { value: "diesel", label: "Diésel", unit: "CLP/L" },
  { value: "electric", label: "⚡ Carga EV", unit: "CLP/kWh" },
];

const MAX_NOTE = 280;
const MAX_PHOTO_MB = 5;

const ReportPriceDialog = ({ station }: ReportPriceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fuelType, setFuelType] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reportPrice = useReportPrice();
  const { user } = useAuth();
  const navigate = useNavigate();

  const reset = () => {
    setFuelType("");
    setPrice("");
    setNote("");
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoErr(null);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !user) {
      navigate("/auth");
      return;
    }
    if (!isOpen) reset();
    setOpen(isOpen);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoErr("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoErr(`La foto supera los ${MAX_PHOTO_MB}MB.`);
      return;
    }
    setPhotoErr(null);
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const isElectric = fuelType === "electric";
  const minPrice = isElectric ? 100 : 700;
  const maxPrice = isElectric ? 800 : 2600;
  const numPrice = parseInt(price, 10);
  const priceValid =
    !isNaN(numPrice) && numPrice >= minPrice && numPrice <= maxPrice;

  const canSubmit =
    !!fuelType && priceValid && note.length <= MAX_NOTE && !reportPrice.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    reportPrice.mutate(
      {
        stationId: station.id,
        fuelType,
        price: numPrice,
        note: note || undefined,
        photoFile: photo,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          title="Reportar precio"
          aria-label="Reportar precio"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-heading flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Reportar precio
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate">{station.name}</p>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Tu reporte se verifica automáticamente con IA. Una foto del tótem o
          surtidor ayuda a aprobarlo más rápido.
        </p>

        <div className="space-y-3 mt-1">
          <Select value={fuelType} onValueChange={setFuelType}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Tipo de combustible" />
            </SelectTrigger>
            <SelectContent>
              {FUEL_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={isElectric ? "Precio (CLP/kWh)" : "Precio (CLP/L)"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl"
              min={minPrice}
              max={maxPrice}
            />
            {fuelType && price && !priceValid && (
              <p className="text-[10px] text-destructive mt-1">
                Debe estar entre {minPrice} y {maxPrice} CLP.
              </p>
            )}
          </div>

          <div>
            <Textarea
              placeholder="Comentario opcional (lo que viste en el tótem, hora, surtidor...)"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
              className="rounded-xl min-h-[60px] text-xs resize-none"
              rows={2}
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">
              {note.length}/{MAX_NOTE}
            </p>
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={photoPreview}
                  alt="Vista previa del reporte"
                  loading="lazy"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur rounded-full p-1 hover:bg-background"
                  aria-label="Quitar foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="w-full rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors py-3 flex flex-col items-center gap-1"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Subir foto del tótem (recomendado)
                </span>
              </button>
            )}
            {photoErr && (
              <p className="text-[10px] text-destructive mt-1">{photoErr}</p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl"
          >
            {reportPrice.isPending ? "Verificando..." : "Enviar reporte"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPriceDialog;
