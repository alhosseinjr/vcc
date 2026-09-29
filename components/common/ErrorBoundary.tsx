"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface State { failed: boolean }
/** Catches render crashes so users see a friendly message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(err: Error, info: ErrorInfo): void { console.error("UI crash:", err.message, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-md space-y-3 py-20 text-center">
        <h1 className="text-xl font-semibold">Something went wrong 😕</h1>
        <p className="text-sm text-muted">Your code is safe; nothing was lost. Reload to try again.</p>
        <button className="rounded-xl bg-accent px-4 py-2 text-sm text-accent-fg" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
