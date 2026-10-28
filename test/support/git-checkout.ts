import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

// Commits every change in the checkout `work` and pushes it to main.
function pushAll(work: string, message: string) {
  git(work, "add", "--all");
  git(work, "-c", "user.name=test", "-c", "user.email=test@example.org", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", message);
  git(work, "push", "--quiet", "origin", "main");
}

// Clones `remote` into the empty directory `dir`, deletes the `remove` paths, writes
// `files` (paths to text), and pushes the change to main, so a checkout made before
// does not change.
export function pushFromClone(remote: string, dir: string, files: Record<string, string>, remove: string[] = []) {
  const other = join(dir, "other");
  git(dir, "clone", "--quiet", remote, other);
  for (const path of remove) git(other, "rm", "-r", "--quiet", path);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(other, path, ".."), { recursive: true });
    writeFileSync(join(other, path), text);
  }
  pushAll(other, "change");
}

// In the empty directory `dir`, a checkout whose remote `origin` is a bare repo with one
// commit on main. The commit's plugins/ folder holds a copy of `plugins`, or only a
// .gitkeep file.
export function checkout(dir: string, plugins?: string) {
  const remote = join(dir, "remote.git");
  const work = join(dir, "work");
  git(dir, "init", "--quiet", "--bare", "--initial-branch=main", remote);
  git(dir, "init", "--quiet", "--initial-branch=main", work);
  writeFileSync(join(work, "README.md"), "index\n");
  if (plugins) cpSync(plugins, join(work, "plugins"), { recursive: true });
  else {
    mkdirSync(join(work, "plugins"));
    writeFileSync(join(work, "plugins", ".gitkeep"), "");
  }
  git(work, "remote", "add", "origin", remote);
  pushAll(work, "start");
  return { remote, work };
}
