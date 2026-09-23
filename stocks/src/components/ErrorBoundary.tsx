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
          <div className="flex min-h-screen items-center justify-center bg-background px-[var(--page-pad)]">
            <div className="w-full max-w-lg rounded-xl border border-tile-line bg-background p-6 md:p-7">
              <p className="ed-label">{getI18n().t("error.cap", { ns: "app" })}</p>
              <h1 className="ed-h3 mt-2">{getI18n().t("error.title", { ns: "app" })}</h1>
              <p className="mt-3 break-all font-mono text-sm text-muted-foreground">
                {this.state.error?.message ?? getI18n().t("error.unknown", { ns: "app" })}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 rounded-lg bg-accent-yellow px-4 py-2.5 text-sm font-bold uppercase tracking-wide hover:brightness-95"
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
