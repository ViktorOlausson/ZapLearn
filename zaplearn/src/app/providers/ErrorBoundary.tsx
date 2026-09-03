import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryState = { failed: boolean };

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ZapLearn rendering failure", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">
            Your local data is still safe. Reload ZapLearn to try again.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload ZapLearn
          </Button>
        </div>
      </main>
    );
  }
}
