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
            <div className="hs-card w-full max-w-lg p-6 md:p-8">
              <span className="hs-tag hs-mono-xs">{getI18n().t("error.cap", { ns: "app" })}</span>
              <h1 className="hs-h3 mt-5">{getI18n().t("error.title", { ns: "app" })}</h1>
              <p className="hs-mono mt-4 break-all rounded-xl border border-tile-line bg-background px-4 py-3 text-muted-foreground">
                {this.state.error?.message ?? getI18n().t("error.unknown", { ns: "app" })}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="hs-btn hs-btn-primary mt-6"
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
