import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateOrgDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const { createOrg } = useOrganization();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createOrg.mutateAsync(name.trim());
      toast.success("Organización creada");
      onOpenChange(false);
      navigate("/empresa/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear organización");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle>Crear organización</DialogTitle>
          <DialogDescription>
            Crea una empresa para gestionar la flota de vehículos y los gastos de combustible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Nombre de la empresa</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Transportes Andes S.A."
              required
              maxLength={80}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)]"
            disabled={createOrg.isPending}
          >
            {createOrg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear organización
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinOrgDialog({ open, onOpenChange }: Props) {
  const [code, setCode] = useState("");
  const { joinOrg } = useOrganization();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await joinOrg.mutateAsync(code);
      toast.success("Te uniste a la organización");
      onOpenChange(false);
      navigate("/empresa/mi-vehiculo");
    } catch (err: any) {
      toast.error(err.message ?? "Código no encontrado");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unirme con código</DialogTitle>
          <DialogDescription>
            Ingresa el código de 8 caracteres que te entregó el administrador de tu empresa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-code">Código de empresa</Label>
            <Input
              id="org-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD2345"
              required
              maxLength={8}
              className="font-mono text-center text-lg tracking-widest uppercase"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)]"
            disabled={joinOrg.isPending}
          >
            {joinOrg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Unirme
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
