"use client";

/**
 * Minimal global error UI. Must not use layout providers, hooks, or CSS that
 * depends on the root layout — this renders instead of layout.tsx on failure.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#52525b", marginTop: "0.75rem" }}>An unexpected error occurred. Please try again.</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1.25rem",
            padding: "0.5rem 1rem",
            border: "1px solid #d4d4d8",
            borderRadius: "0.375rem",
            background: "#fff",
            cursor: "pointer",
          }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
