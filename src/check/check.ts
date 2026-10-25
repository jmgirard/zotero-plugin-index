import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import indexSchema from "../../schemas/index.v1.schema.json" with { type: "json" };

export type Rule =
  | "files-present"
  | "registry-schema"
  | "index-schema"
  | "id-matches-directory"
  | "reason-not-blank";

export interface Finding {
  entry: string;
  rule: Rule;
  message: string;
}

export interface CheckResult {
  checked: number;
  findings: Finding[];
}

export function compileValidators(registrySchema: object) {
  const ajv = new Ajv({ allErrors: true });
  // The registry schema carries this editor-only keyword.
  ajv.addKeyword({ keyword: "markdownDescription", schemaType: "string" });
  return {
    meta: ajv.compile(registrySchema),
    index: ajv.compile(indexSchema),
  };
}

type Validators = ReturnType<typeof compileValidators>;

export async function checkTree(root: string, validators: Validators): Promise<CheckResult> {
  const entries = await listEntries(root);
  const findings: Finding[] = [];
  for (const { name, readError } of entries) {
    if (readError) {
      findings.push({ entry: name, rule: "files-present", message: `cannot read the entry: ${readError}` });
      continue;
    }
    findings.push(...(await checkEntry(join(root, name), name, validators)));
  }
  return { checked: entries.length, findings };
}

interface ListedEntry {
  name: string;
  readError?: string;
}

async function listEntries(root: string): Promise<ListedEntry[]> {
  let names: string[];
  try {
    names = await readdir(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const entries: ListedEntry[] = [];
  for (const name of names.sort()) {
    // Editor and system folders such as .idea are not entries.
    if (name.startsWith(".")) continue;
    try {
      if ((await stat(join(root, name))).isDirectory()) entries.push({ name });
    } catch (error) {
      // A broken symlink, for example: report it as an entry that cannot be read.
      entries.push({ name, readError: (error as Error).message });
    }
  }
  return entries;
}

async function checkEntry(dir: string, entry: string, validators: Validators): Promise<Finding[]> {
  const findings: Finding[] = [];
  const add = (rule: Rule, message: string) => findings.push({ entry, rule, message });

  const meta = await readJson(join(dir, "meta.json"));
  const index = await readJson(join(dir, "index.json"));
  const missing = [meta.missing && "meta.json", index.missing && "index.json"].filter(Boolean);
  if (missing.length > 0) add("files-present", `missing ${missing.join(" and ")}`);
  if (meta.readError) add("files-present", `cannot read meta.json: ${meta.readError}`);
  if (index.readError) add("files-present", `cannot read index.json: ${index.readError}`);

  if (meta.error) add("registry-schema", `meta.json is not valid JSON: ${meta.error}`);
  else if ("value" in meta) validate(validators.meta, meta.value, "meta.json", "registry-schema", add);

  if (index.error) add("index-schema", `index.json is not valid JSON: ${index.error}`);
  else if ("value" in index) validate(validators.index, index.value, "index.json", "index-schema", add);

  const id = (meta.value as { id?: unknown } | undefined)?.id;
  if (typeof id === "string" && id !== entry) {
    add("id-matches-directory", `meta.json id "${id}" differs from the directory name`);
  }

  const overrides = (index.value as { overrides?: unknown } | undefined)?.overrides;
  if (Array.isArray(overrides)) {
    overrides.forEach((override, i) => {
      const reason = (override as { reason?: unknown } | null)?.reason;
      if (typeof reason === "string" && reason.length > 0 && !/\S/.test(reason)) {
        add("reason-not-blank", `overrides[${i}].reason holds only whitespace`);
      }
    });
  }
  return findings;
}

function validate(
  fn: ValidateFunction,
  value: unknown,
  file: string,
  rule: Rule,
  add: (rule: Rule, message: string) => void,
) {
  if (fn(value)) return;
  for (const error of fn.errors ?? []) add(rule, `${file}: ${describe(error)}`);
}

function describe(error: ErrorObject): string {
  const where = error.instancePath || "(root)";
  if (error.keyword === "additionalProperties") {
    return `${where} has field "${error.params.additionalProperty}" that the schema does not define`;
  }
  return `${where} ${error.message ?? "is invalid"}`;
}

interface JsonRead {
  missing: boolean;
  readError?: string;
  error?: string;
  value?: unknown;
}

async function readJson(path: string): Promise<JsonRead> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { missing: true };
    return { missing: false, readError: (error as Error).message };
  }
  try {
    return { missing: false, value: JSON.parse(text) };
  } catch (error) {
    return { missing: false, error: (error as Error).message };
  }
}
