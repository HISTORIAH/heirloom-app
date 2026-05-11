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
            <div className="max-w-lg w-full border-2 border-foreground rounded-xl p-6 bg-secondary">
              <h1 className="text-2xl font-black text-red-500 mb-4">Something went wrong</h1>
              <p className="text-sm font-mono break-all text-muted-foreground mb-4">
                {this.state.error?.message ?? "Unknown error"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="border-2 border-foreground bg-lime-400 px-4 py-2 font-bold rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
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
