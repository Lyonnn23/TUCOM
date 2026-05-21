import { useState } from "react";
import { Plus } from "lucide-react";
import FuelLogDialog from "@/components/FuelLogDialog";
import { useAuth } from "@/hooks/useAuth";

const FuelLogFAB = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Registrar carga de combustible"
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-gradient-primary text-primary-foreground shadow-elegant flex items-center justify-center press-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus className="w-6 h-6" aria-hidden="true" />
      </button>
      <FuelLogDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FuelLogFAB;
