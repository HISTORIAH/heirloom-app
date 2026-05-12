import { Component, type ReactNode } from "react";

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
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="neo-card-static max-w-lg w-full">
              <h1 className="text-2xl font-black text-accent-red mb-4">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-4 font-mono text-sm break-all">
                {this.state.error?.message ?? "Unknown error"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="neo-border bg-accent-lime px-4 py-2 font-bold rounded-lg hover:neo-shadow-sm transition-shadow"
              >
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
