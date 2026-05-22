import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type VehicleDocType =
  | "revision_tecnica"
  | "soap"
  | "permiso_circulacion"
  | "cambio_aceite";

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  user_id: string;
  doc_type: VehicleDocType;
  due_date: string | null;
  last_done_date: string | null;
  last_done_km: number | null;
  reminder_active: boolean;
  notes: string | null;
  updated_at: string;
}

export function useVehicleDocuments(vehicleId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["vehicle_documents", vehicleId],
    enabled: !!vehicleId,
    queryFn: async (): Promise<VehicleDocument[]> => {
      const { data, error } = await supabase
        .from("vehicle_documents")
        .select("*")
        .eq("vehicle_id", vehicleId!);
      if (error) throw error;
      return (data ?? []) as VehicleDocument[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (
      doc: { doc_type: VehicleDocType } & Partial<Omit<VehicleDocument, "id" | "user_id" | "vehicle_id" | "updated_at">>,
    ) => {
      if (!user || !vehicleId) throw new Error("not_authenticated");
      const payload = {
        user_id: user.id,
        vehicle_id: vehicleId,
        reminder_active: true,
        ...doc,
      };
      const { error } = await supabase
        .from("vehicle_documents")
        .upsert(payload, { onConflict: "vehicle_id,doc_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle_documents", vehicleId] });
      qc.invalidateQueries({ queryKey: ["upcoming_deadlines"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (docType: VehicleDocType) => {
      if (!vehicleId) return;
      const { error } = await supabase
        .from("vehicle_documents")
        .delete()
        .eq("vehicle_id", vehicleId)
        .eq("doc_type", docType);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicle_documents", vehicleId] }),
  });

  const byType = (t: VehicleDocType) => list.data?.find((d) => d.doc_type === t);

  return { ...list, documents: list.data ?? [], byType, upsert, remove };
}

export interface UpcomingDeadline {
  vehicle_id: string;
  vehicle_name: string;
  doc_type: VehicleDocType;
  due_date: string;
  days_left: number;
}

export function useUpcomingDeadlines() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["upcoming_deadlines", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      const { data: docs, error } = await supabase
        .from("vehicle_documents")
        .select("vehicle_id, doc_type, due_date, last_done_date")
        .eq("user_id", user!.id)
        .eq("reminder_active", true);
      if (error) throw error;

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const vehicleIds = [...new Set((docs ?? []).map((d) => d.vehicle_id))];
      const { data: vehs } = vehicleIds.length
        ? await supabase.from("user_vehicles").select("id,nickname,brand,model").in("id", vehicleIds)
        : { data: [] as any[] };
      const nameOf = (id: string) => {
        const v = vehs?.find((x: any) => x.id === id);
        if (!v) return "vehículo";
        return v.nickname || `${v.brand} ${v.model}`.trim();
      };

      const out: UpcomingDeadline[] = [];
      for (const d of docs ?? []) {
        let due: string | null = null;
        if (d.doc_type === "revision_tecnica" || d.doc_type === "soap") {
          due = d.due_date;
        } else if (d.doc_type === "cambio_aceite" && d.last_done_date) {
          const t = new Date(d.last_done_date); t.setMonth(t.getMonth() + 6);
          due = t.toISOString().slice(0, 10);
        } else if (d.doc_type === "permiso_circulacion") {
          const year = today.getMonth() >= 3 ? today.getFullYear() + 1 : today.getFullYear();
          due = `${year}-03-31`;
        }
        if (!due) continue;
        const days = Math.round((new Date(due).getTime() - today.getTime()) / 86400000);
        if (days < 0 || days > 30) continue;
        out.push({
          vehicle_id: d.vehicle_id,
          vehicle_name: nameOf(d.vehicle_id),
          doc_type: d.doc_type as VehicleDocType,
          due_date: due,
          days_left: days,
        });
      }
      out.sort((a, b) => a.days_left - b.days_left);
      return out;
    },
  });
}
