import { Component, type ReactNode } from "react";
import { getI18n } from "@heirloom/i18n";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="panel panel-pad-lg w-full max-w-lg">
              <h1 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-accent-red">
                {getI18n().t("error.title", { ns: "app" })}
              </h1>
              <p className="text-muted-foreground mb-4 font-mono text-sm break-all">
                {this.state.error?.message ?? getI18n().t("error.unknown", { ns: "app" })}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-accent-yellow bg-accent-yellow px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:brightness-95"
              >
                {getI18n().t("error.reload", { ns: "app" })}
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
