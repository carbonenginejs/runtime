import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// A "#blue/<file>" import resolves to npm/dist/global/blue/<file>.js in the
// published package, but rollup keeps "#" imports external and only emits
// modules the export graph reaches (plus privateInputs). A target nothing else
// reaches would be missing from the package, and fail only for consumers.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function walk(dir, out = [])
{
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }))
  {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full.endsWith(".js")) out.push(full);
  }
  return out;
}

test("every #blue/* import target is emitted to npm/dist", () =>
{
  const targets = new Set();
  for (const file of walk(path.join(root, "src")))
  {
    for (const match of fs.readFileSync(file, "utf8").matchAll(/from\s+"#blue\/([\w./-]+)"|import\s+"#blue\/([\w./-]+)"/g))
    {
      targets.add(match[1] ?? match[2]);
    }
  }
  assert.ok(targets.size > 0, "the scan found the known #blue/* imports");
  for (const target of targets)
  {
    const emitted = path.join(root, "npm", "dist", "global", "blue", `${target}.js`);
    assert.ok(fs.existsSync(emitted), `#blue/${target} has no emitted npm/dist/global/blue/${target}.js; add it to privateInputs in rollup.config.mjs`);
  }
});
