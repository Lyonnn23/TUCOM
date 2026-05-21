import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPrice } from "@/lib/format";
import type { FleetVehicleRow, Organization } from "@/hooks/useOrganization";

interface Props {
  org: Organization;
  rows: FleetVehicleRow[];
}

const monthLabel = () =>
  new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date());

export function FleetExportButtons({ org, rows }: Props) {
  const exportCsv = () => {
    const headers = ["Vehículo", "Marca", "Modelo", "Gasto mes (CLP)", "Gasto total (CLP)", "Litros totales", "Km totales", "Costo por km", "Última carga"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          JSON.stringify(r.nickname ?? `${r.brand} ${r.model}`),
          JSON.stringify(r.brand),
          JSON.stringify(r.model),
          r.month_spend,
          r.total_spend,
          Number(r.total_liters).toFixed(2),
          r.total_km,
          r.cost_per_km != null ? Math.round(r.cost_per_km) : "",
          r.last_log_at ?? "",
        ].join(",")
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flota-${org.name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Reporte de flota", 40, 35);
    doc.setFontSize(11);
    doc.text(`${org.name} — ${monthLabel()}`, 40, 55);

    // Logo (best effort)
    if (org.logo_url) {
      try {
        const img = await fetch(org.logo_url).then((r) => r.blob());
        const dataUrl = await new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.readAsDataURL(img);
        });
        doc.addImage(dataUrl, "PNG", pageWidth - 90, 15, 50, 50);
      } catch { /* ignore */ }
    }

    doc.setTextColor(0, 0, 0);
    const totalMonth = rows.reduce((s, r) => s + r.month_spend, 0);
    const totalAll = rows.reduce((s, r) => s + r.total_spend, 0);
    const totalKm = rows.reduce((s, r) => s + r.total_km, 0);

    doc.setFontSize(11);
    doc.text(`Total del mes: ${formatPrice(totalMonth)}`, 40, 100);
    doc.text(`Total histórico: ${formatPrice(totalAll)}`, 40, 118);
    doc.text(`Km totales: ${totalKm.toLocaleString("es-CL")}`, 40, 136);
    doc.text(`Vehículos: ${rows.length}`, 40, 154);

    autoTable(doc, {
      startY: 175,
      head: [["Vehículo", "Marca/Modelo", "Gasto mes", "Km", "$/km", "Última carga"]],
      body: rows.map((r) => [
        r.nickname ?? `${r.brand} ${r.model}`,
        `${r.brand} ${r.model}`,
        formatPrice(r.month_spend),
        r.total_km > 0 ? `${r.total_km.toLocaleString("es-CL")} km` : "—",
        r.cost_per_km != null ? `$${Math.round(r.cost_per_km)}/km` : "—",
        r.last_log_at
          ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(new Date(r.last_log_at))
          : "—",
      ]),
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Generado con TÜcom Empresa — Compatible con software contable chileno (Defontana, Softland, Manager). Importa este CSV en la sección 'Gastos de operación'.",
      40,
      finalY + 30,
      { maxWidth: pageWidth - 80 }
    );

    doc.save(`reporte-flota-${org.name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 7)}.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={exportPdf} className="bg-gradient-to-r from-primary to-[hsl(245,75%,60%)]">
        <FileText className="h-4 w-4 mr-2" /> Reporte PDF
      </Button>
      <Button variant="outline" onClick={exportCsv}>
        <FileDown className="h-4 w-4 mr-2" /> Exportar CSV
      </Button>
    </div>
  );
}
