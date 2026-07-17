import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganization, useFleetMembers } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Upload, Trash2, Shield, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function EmpresaConfig() {
  const qc = useQueryClient();
  const { org, role, isLoading } = useOrganization();
  const { data: members = [] } = useFleetMembers(org?.id);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(org?.name ?? "");

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!org) return <Navigate to="/empresa" replace />;
  if (role !== "admin") return <Navigate to="/empresa/mi-vehiculo" replace />;

  const copyCode = () => {
    navigator.clipboard.writeText(org.company_code);
    toast.success("Código copiado");
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${org.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
      const { error: uErr } = await (supabase as any).from("organizations").update({ logo_url: pub.publicUrl }).eq("id", org.id);
      if (uErr) throw uErr;
      qc.invalidateQueries({ queryKey: ["organization_membership"] });
      toast.success("Logo actualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir logo");
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    const { error } = await (supabase as any).from("organizations").update({ name: name.trim() }).eq("id", org.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Nombre actualizado");
      qc.invalidateQueries({ queryKey: ["organization_membership"] });
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("¿Eliminar este miembro de la organización?")) return;
    const { error } = await (supabase as any).from("organization_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Miembro eliminado");
      qc.invalidateQueries({ queryKey: ["fleet_members"] });
    }
  };

  const toggleRole = async (id: string, current: "admin" | "driver") => {
    const next = current === "admin" ? "driver" : "admin";
    const { error } = await (supabase as any).from("organization_members").update({ role: next }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Rol actualizado a ${next}`);
      qc.invalidateQueries({ queryKey: ["fleet_members"] });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos de la empresa, logo y miembros.</p>
      </div>

      <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-semibold">Datos de la empresa</h2>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={saveName}>Guardar</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Código de empresa</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono tracking-widest text-lg bg-muted px-4 py-2 rounded-xl text-center">{org.company_code}</code>
            <Button variant="outline" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Comparte este código con tus conductores para que se unan.</p>
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt="Logo" loading="lazy" className="w-16 h-16 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xs">Sin logo</div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <Button asChild variant="outline" disabled={uploading}>
                <span><Upload className="h-4 w-4 mr-2" />{uploading ? "Subiendo..." : "Subir logo"}</span>
              </Button>
            </label>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Miembros ({members.length})</h2>
        </div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  {m.role === "admin" ? <Shield className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <div className="text-sm font-medium font-mono">{m.user_id.slice(0, 8)}…</div>
                  <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleRole(m.id, m.role)}>
                  {m.role === "admin" ? "Quitar admin" : "Hacer admin"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
