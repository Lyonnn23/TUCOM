import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}
interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual feature panels (Map, Chat,
 * Calculator, Benefits). Shows an inline retry card instead of crashing
 * the whole app. Use the full <ErrorBoundary> only at the app root.
 */
class LocalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[TÜcom] ${this.props.label ?? "panel"} crashed:`, error, info.componentStack);
  }

  retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <p className="font-heading font-bold text-sm text-foreground">Algo salió mal</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No pudimos cargar esta sección.
          </p>
        </div>
        <button
          onClick={this.retry}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-h-11"
          style={{ touchAction: "manipulation" }}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }
}

export default LocalErrorBoundary;
