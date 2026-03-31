import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportPriceInput {
  stationId: string;
  fuelType: string;
  price: number;
}

export function useReportPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stationId, fuelType, price }: ReportPriceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Debes iniciar sesión para reportar precios");

      // Insert report
      const { error: reportErr } = await supabase
        .from("reported_prices")
        .insert({ station_id: stationId, fuel_type: fuelType, price, user_id: user.id });
      if (reportErr) throw reportErr;

      // Update station price
      const { error: updateErr } = await supabase
        .from("station_prices")
        .upsert(
          { station_id: stationId, fuel_type: fuelType, price, reported_by: user.id },
          { onConflict: "station_id,fuel_type" }
        );
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      toast.success("¡Precio reportado! Gracias por contribuir 🙌");
      queryClient.invalidateQueries({ queryKey: ["gas-stations"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
