import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(workspaceRoot, "packages/extension");
const extensionSrc = path.resolve(extensionRoot, "src");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${extensionSrc}/`,
      },
      {
        find: /^~\//,
        replacement: `${extensionSrc}/`,
      },
      {
        find: /^@@\//,
        replacement: `${extensionRoot}/`,
      },
      {
        find: /^~~\//,
        replacement: `${extensionRoot}/`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["packages/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/dist/**",
      "**/.output/**",
      "**/.wxt/**",
      "**/node_modules/**",
    ],
  },
});
