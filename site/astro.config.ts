import { defineConfig } from "astro/config";
import { BASE } from "./src/base.ts";

// pnpm site (src/site/cli.ts) passes outDir and the data file. The site lives under the
// repo's GitHub Pages path, so every link starts with BASE.
export default defineConfig({
  output: "static",
  base: BASE,
  trailingSlash: "always",
  build: { format: "directory" },
});
