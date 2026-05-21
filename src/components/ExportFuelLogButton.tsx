import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import { toast } from "sonner";
import { formatPrice, formatSmartDate } from "@/lib/format";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "Bencina 93",
  gasoline95: "Bencina 95",
  gasoline97: "Bencina 97",
  diesel: "Diésel",
  electric: "Eléctrico",
};

const ExportFuelLogButton = () => {
  const { logs } = useFuelLogs();
  const [busy, setBusy] = useState(false);

  const exportCsv = () => {
    if (!logs.length) {
      toast.info("Aún no tienes cargas registradas.");
      return;
    }
    const headers = ["Fecha", "Combustible", "Litros", "Precio/L", "Total", "Odómetro", "Nota"];
    const rows = logs.map((l) => [
      new Date(l.logged_at).toISOString(),
      FUEL_LABEL[l.fuel_type] ?? l.fuel_type,
      l.liters,
      l.price_per_liter,
      l.total_cost,
      l.odometer_km ?? "",
      (l.note ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c)}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tucom-cargas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  const exportPdf = async () => {
    if (!logs.length) {
      toast.info("Aún no tienes cargas registradas.");
      return;
    }
    setBusy(true);
    try {
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("TÜcom — Bitácora de cargas", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generado el ${new Date().toLocaleDateString("es-CL")}`, 14, 25);

      const totalSpent = logs.reduce((s, l) => s + l.total_cost, 0);
      const totalLiters = logs.reduce((s, l) => s + Number(l.liters), 0);
      doc.setTextColor(0);
      doc.text(
        `Total: ${formatPrice(totalSpent)} · ${totalLiters.toFixed(1)} L · ${logs.length} cargas`,
        14, 32,
      );

      autoTable(doc, {
        startY: 38,
        head: [["Fecha", "Combustible", "Litros", "Precio/L", "Total", "Odómetro"]],
        body: logs.map((l) => [
          formatSmartDate(l.logged_at),
          FUEL_LABEL[l.fuel_type] ?? l.fuel_type,
          Number(l.liters).toFixed(2),
          formatPrice(l.price_per_liter),
          formatPrice(l.total_cost),
          l.odometer_km != null ? `${l.odometer_km} km` : "—",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [124, 58, 237] },
      });

      doc.save(`tucom-cargas-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCsv} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf} className="gap-2">
          <FileText className="w-4 h-4" /> Descargar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportFuelLogButton;
