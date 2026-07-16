import { Component, ErrorInfo, ReactNode } from "react";
import { Zap } from "lucide-react";
import * as Sentry from "@sentry/react";

interface Props {
  children?: ReactNode;
  error?: Error | null;
  resetError?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isDev = import.meta.env.DEV;

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report to Sentry while keeping the existing console log.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
    console.error("[TÜcom] Unhandled error:", error, info.componentStack);
  }

  handleReload = () => {
    try {
      this.props.resetError?.();
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  render() {
    const error = this.props.error ?? this.state.error;
    const hasError = !!error;
    if (!hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-6">
          <Zap className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-heading font-bold text-2xl mb-2">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          La app encontró un error inesperado. Intenta recargarla para continuar.
        </p>
        <button
          onClick={this.handleReload}
          className="h-12 px-6 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-elegant hover-scale"
        >
          Recargar aplicación
        </button>
        <p className="text-xs text-muted-foreground mt-6">
          Si el problema persiste, escríbenos a{" "}
          <a
            className="underline text-primary"
            href="mailto:soporte@tucombustible.cl"
          >
            soporte@tucombustible.cl
          </a>
        </p>
        {isDev && error && (
          <pre className="mt-6 max-w-xl w-full text-left text-[10px] text-destructive bg-destructive/10 rounded-xl p-3 overflow-auto max-h-64">
            {error.stack || error.message}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
