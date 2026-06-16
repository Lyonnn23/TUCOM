import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Contacto = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Contacto · TÜcom</title>
        <meta name="description" content="Contáctanos en TÜcom para soporte, alianzas o sugerencias." />
        <link rel="canonical" href="https://tucombustible.cl/contacto" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-3xl font-extrabold">Contacto</h1>
        <p className="text-muted-foreground mt-2">
          ¿Tienes sugerencias, problemas o quieres proponer una alianza? Escríbenos.
        </p>
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--gradient-primary)" }}>
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Correo</div>
              <a href="mailto:hola@tucombustible.cl" className="text-primary hover:underline">
                hola@tucombustible.cl
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Contacto;
