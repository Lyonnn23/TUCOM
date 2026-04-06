import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquarePlus } from "lucide-react";
import { useReportPrice } from "@/hooks/useReportPrice";
import { useAuth } from "@/hooks/useAuth";
import type { GasStation } from "@/hooks/useGasStations";

interface ReportPriceDialogProps {
  station: GasStation;
}

const fuelTypes = [
  { value: "gasoline93", label: "Bencina 93" },
  { value: "gasoline95", label: "Bencina 95" },
  { value: "gasoline97", label: "Bencina 97" },
  { value: "diesel", label: "Diésel" },
];

const ReportPriceDialog = ({ station }: ReportPriceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fuelType, setFuelType] = useState("");
  const [price, setPrice] = useState("");
  const reportPrice = useReportPrice();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !user) {
      navigate("/auth");
      return;
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    const numPrice = parseInt(price, 10);
    if (!fuelType || isNaN(numPrice) || numPrice < 500 || numPrice > 2500) return;
    reportPrice.mutate(
      { stationId: station.id, fuelType, price: numPrice },
      { onSuccess: () => { setOpen(false); setFuelType(""); setPrice(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[340px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-heading">Reportar precio</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{station.name}</p>
        <div className="space-y-3 mt-2">
          <Select value={fuelType} onValueChange={setFuelType}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Tipo de combustible" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Precio (CLP/L)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl"
            min={500}
            max={2500}
          />
          <Button
            onClick={handleSubmit}
            disabled={reportPrice.isPending || !fuelType || !price}
            className="w-full rounded-xl"
          >
            {reportPrice.isPending ? "Enviando..." : "Reportar precio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPriceDialog;
