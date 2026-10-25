import { join, resolve } from "node:path";
import process, { argv } from "node:process";
import { checkTree, compileValidators } from "./check.ts";
import { loadRegistrySchema, RegistrySchemaUnavailable } from "./registry-schema.ts";

const CACHE_DIR = join(import.meta.dirname, "..", "..", ".cache");

async function main(): Promise<number> {
  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so a relative <dir> resolves against where the user typed it.
  const given = argv[2];
  const root = given ? resolve(process.env.INIT_CWD ?? process.cwd(), given) : "plugins";

  let registrySchema: object;
  try {
    registrySchema = await loadRegistrySchema(CACHE_DIR);
  } catch (error) {
    if (error instanceof RegistrySchemaUnavailable) {
      console.error(`registry-schema-unavailable: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const { checked, findings } = await checkTree(root, compileValidators(registrySchema));
  for (const finding of findings) {
    console.log(`${finding.entry}: ${finding.rule}: ${finding.message}`);
  }
  console.log(`checked ${checked} entries in ${given ?? root}, ${findings.length} problems`);
  return findings.length > 0 ? 1 : 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
