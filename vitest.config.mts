import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Node has no concept of the "react-server" export condition Next's
      // bundler sets when resolving this package, so the plain `default`
      // export (which unconditionally throws) is what Node would otherwise
      // pick. Point straight at the package's own no-op build instead.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
