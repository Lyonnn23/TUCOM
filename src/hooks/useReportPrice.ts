import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportPriceInput {
  stationId: string;
  fuelType: string;
  price: number;
  note?: string;
  photoFile?: File | null;
}

export function useReportPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stationId,
      fuelType,
      price,
      note,
      photoFile,
    }: ReportPriceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión para reportar precios");

      // 1. Upload photo if present
      let photoPath: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)
          ? ext
          : "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
        const { error: upErr } = await supabase.storage
          .from("price-reports")
          .upload(path, photoFile, {
            contentType: photoFile.type || "image/jpeg",
            upsert: false,
          });
        if (upErr) throw new Error(`No se pudo subir la foto: ${upErr.message}`);
        photoPath = path;
      }

      // 2. Insert report (status defaults to 'pending')
      const { data: inserted, error: reportErr } = await supabase
        .from("reported_prices")
        .insert({
          station_id: stationId,
          fuel_type: fuelType,
          price,
          user_id: user.id,
          note: note?.trim() || null,
          photo_path: photoPath,
        })
        .select("id")
        .single();
      if (reportErr) throw reportErr;

      // 3. Trigger verification edge function (don't block UI if it fails)
      const { data: verifyData, error: verifyErr } = await supabase.functions
        .invoke("verify-price-report", {
          body: { reportId: inserted.id },
        });

      if (verifyErr) {
        console.warn("Verification failed:", verifyErr);
        return { status: "pending" as const };
      }

      return verifyData as {
        status: "verified" | "needs_review" | "rejected" | "pending";
        notes?: string;
      };
    },
    onSuccess: (result) => {
      const status = result?.status ?? "pending";
      if (status === "verified") {
        toast.success("¡Reporte verificado! Gracias por contribuir 🙌");
        queryClient.invalidateQueries({ queryKey: ["gas-stations"] });
      } else if (status === "rejected") {
        toast.error(
          "Tu reporte no pasó la verificación automática. Intenta adjuntar una foto clara del tótem.",
        );
      } else {
        toast.info(
          "Reporte recibido. Será revisado y publicado si se confirma. ¡Gracias!",
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
