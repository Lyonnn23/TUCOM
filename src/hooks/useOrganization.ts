import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Organization {
  id: string;
  name: string;
  company_code: string;
  logo_url: string | null;
  plan: "basico" | "pro";
  max_vehicles: number;
  created_by: string;
  created_at: string;
}

export interface OrgMembership {
  organization_id: string;
  role: "admin" | "driver";
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "admin" | "driver";
  joined_at: string;
}

// Plan constants for fleet
export const FLEET_PLAN_LIMITS = {
  basico: { vehicles: 3, label: "Empresa Básico", price: 0 },
  pro: { vehicles: Infinity, label: "Empresa Pro", price: null }, // contactar
} as const;

export function useOrganization() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const membership = useQuery({
    queryKey: ["organization_membership", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ org: Organization; role: "admin" | "driver" } | null> => {
      const { data: memb, error: e1 } = await (supabase as any)
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (e1) throw e1;
      if (!memb) return null;
      const { data: org, error: e2 } = await (supabase as any)
        .from("organizations")
        .select("*")
        .eq("id", memb.organization_id)
        .maybeSingle();
      if (e2) throw e2;
      if (!org) return null;
      return { org: org as Organization, role: memb.role as "admin" | "driver" };
    },
  });

  const createOrg = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("not_authenticated");
      const { data: code, error: cErr } = await (supabase as any).rpc("generate_company_code");
      if (cErr) throw cErr;
      const { data: org, error } = await (supabase as any)
        .from("organizations")
        .insert({ name, company_code: code, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      const { error: mErr } = await (supabase as any)
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "admin" });
      if (mErr) throw mErr;
      return org as Organization;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization_membership"] }),
  });

  const joinOrg = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("not_authenticated");
      const { data: org, error } = await (supabase as any)
        .from("organizations")
        .select("id")
        .eq("company_code", code.toUpperCase().trim())
        .maybeSingle();
      if (error) throw error;
      if (!org) throw new Error("Código no encontrado");
      const { error: mErr } = await (supabase as any)
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "driver" });
      if (mErr) throw mErr;
      return org.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization_membership"] }),
  });

  const leaveOrg = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not_authenticated");
      const orgId = membership.data?.org.id;
      if (!orgId) return;
      const { error } = await (supabase as any)
        .from("organization_members")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization_membership"] }),
  });

  return {
    ...membership,
    org: membership.data?.org ?? null,
    role: membership.data?.role ?? null,
    isAdmin: membership.data?.role === "admin",
    createOrg,
    joinOrg,
    leaveOrg,
  };
}

export function useFleetStats(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["fleet_stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_fleet_stats", { _org_id: orgId });
      if (error) throw error;
      return data as {
        vehicle_count: number;
        driver_count: number;
        month_spend: number;
        month_liters: number;
        total_km: number;
        avg_cost_per_km: number | null;
      };
    },
  });
}

export interface FleetVehicleRow {
  vehicle_id: string;
  nickname: string | null;
  brand: string;
  model: string;
  driver_id: string;
  month_spend: number;
  total_spend: number;
  total_liters: number;
  total_km: number;
  cost_per_km: number | null;
  last_log_at: string | null;
}

export function useFleetBreakdown(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["fleet_breakdown", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<FleetVehicleRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_fleet_breakdown", { _org_id: orgId });
      if (error) throw error;
      return (data ?? []) as FleetVehicleRow[];
    },
  });
}

export function useFleetMembers(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["fleet_members", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OrgMember[]> => {
      const { data, error } = await (supabase as any)
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrgMember[];
    },
  });
}

export function useFleetMonthlySpend(orgId: string | null | undefined, months = 6) {
  return useQuery({
    queryKey: ["fleet_monthly_spend", orgId, months],
    enabled: !!orgId,
    queryFn: async () => {
      // Aggregate by month from fuel_logs joined to user_vehicles where org = orgId
      const since = new Date();
      since.setMonth(since.getMonth() - (months - 1));
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const { data: vehs } = await (supabase as any)
        .from("user_vehicles")
        .select("id")
        .eq("organization_id", orgId);
      const ids = (vehs ?? []).map((v: { id: string }) => v.id);
      if (ids.length === 0) return [];

      const { data: logs, error } = await (supabase as any)
        .from("fuel_logs")
        .select("logged_at,total_cost")
        .in("vehicle_id", ids)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true });
      if (error) throw error;

      const buckets = new Map<string, number>();
      for (let i = 0; i < months; i++) {
        const d = new Date(since);
        d.setMonth(since.getMonth() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, 0);
      }
      for (const l of logs ?? []) {
        const d = new Date(l.logged_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (l.total_cost ?? 0));
      }
      return Array.from(buckets.entries()).map(([month, total]) => ({ month, total }));
    },
  });
}
