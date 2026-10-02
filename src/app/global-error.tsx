"use client";

/**
 * Minimal global error UI. Must not use layout providers, hooks, or CSS that
 * depends on the root layout — this renders instead of layout.tsx on failure.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <style>{`
          :root {
            --bg: #F7EFE2;
            --surface: #FFFBF3;
            --border: #E2D2B8;
            --text: #2C201C;
            --text-muted: #71594F;
          }
          body {
            background: var(--bg);
            color: var(--text);
            font-family: Inter, system-ui, sans-serif;
            margin: 0;
            min-height: 100%;
            padding: 2rem;
          }
        `}</style>
        <h1 style={{ fontSize: "21px", fontWeight: 700, letterSpacing: "-0.015em" }}>Something went wrong</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13.5px", marginTop: "0.75rem" }}>An unexpected error occurred. Please try again.</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1.25rem",
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            background: "var(--surface)",
            color: "var(--text)",
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
