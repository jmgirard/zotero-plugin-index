import { argv, exit } from "node:process";
import { checkTree, compileValidators } from "./check.ts";
import { loadRegistrySchema, RegistrySchemaUnavailable } from "./registry-schema.ts";

const root = argv[2] ?? "plugins";

let registrySchema: object;
try {
  registrySchema = await loadRegistrySchema(".cache");
} catch (error) {
  if (error instanceof RegistrySchemaUnavailable) {
    console.error(`registry-schema-unavailable: ${error.message}`);
    exit(1);
  }
  throw error;
}

const { checked, findings } = await checkTree(root, compileValidators(registrySchema));
for (const finding of findings) {
  console.log(`${finding.entry}: ${finding.rule}: ${finding.message}`);
}
console.log(`checked ${checked} entries in ${root}, ${findings.length} problems`);
exit(findings.length > 0 ? 1 : 0);
