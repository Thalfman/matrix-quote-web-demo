import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to stderr; a server-side log drain (future) can scrape it.
    console.error("RootErrorBoundary", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface p-12 font-sans text-ink">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-4">
            A page in the Matrix Quote Web app crashed. Reload to recover, or
            copy the details below and send them to engineering.
          </p>
          <pre className="mt-6 overflow-auto rounded bg-slate-100 p-4 text-xs">
            {this.state.error.stack || this.state.error.message}
          </pre>
          <button
            className="mt-6 rounded-md bg-teal px-4 py-2 text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
