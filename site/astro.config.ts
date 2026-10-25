import { defineConfig } from "astro/config";
import { BASE } from "./src/base.ts";

// pnpm site (src/site/site.ts) passes a temporary outDir, and the data file path through
// ZPI_SITE_DATA. The site lives under the repo's GitHub Pages path, so every link inside
// the site starts with BASE.
export default defineConfig({
  output: "static",
  base: BASE,
  trailingSlash: "always",
  build: { format: "directory" },
});
