"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fatal">
      <AlertTriangle />
      <h1>Something went wrong</h1>
      <p>{error.message || "The inventory could not be displayed."}</p>
      <button className="primary" onClick={reset}>
        <RefreshCw /> Try Again
      </button>
    </main>
  );
}
