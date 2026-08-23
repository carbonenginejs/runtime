import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import rollupConfig from "../../../rollup.config.mjs";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const npmRoot = path.join(root, "npm");

test("published package exposes every declared subpath", async () =>
{
  const manifest = JSON.parse(await readFile(path.join(npmRoot, "package.json"), "utf8"));

  for (const [subpath, target] of Object.entries(manifest.exports))
  {
    for (const resolved of await expandExportTargets(subpath, target))
    {
      const targetPath = path.resolve(npmRoot, resolved.target);
      await access(targetPath);
      const exports = await import(pathToFileURL(targetPath).href);

      assert.ok(
        exports && typeof exports === "object",
        `${resolved.subpath} must import from ${resolved.target}`
      );
    }
  }
});

async function expandExportTargets(subpath, target)
{
  const star = target.indexOf("*");
  if (star === -1) return [ { subpath, target } ];

  assert.equal(target.indexOf("*", star + 1), -1, `${subpath} has one target wildcard`);
  assert.ok(subpath.includes("*"), `${subpath} mirrors the target wildcard`);

  const prefix = target.slice(0, star);
  const entries = await readdir(path.resolve(npmRoot, prefix), { withFileTypes: true });
  const resolved = entries
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      subpath: subpath.replace("*", entry.name),
      target: target.replace("*", entry.name)
    }));

  assert.ok(resolved.length > 0, `${subpath} must expose at least one built target`);
  return resolved;
}

test("published package includes every README document target", async () =>
{
  const readmePath = path.join(npmRoot, "README.md");
  const readme = await readFile(readmePath, "utf8");
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;

  for (const match of readme.matchAll(linkPattern))
  {
    const target = match[1].trim().split(/\s+/u, 1)[0];

    if (!target || target.startsWith("#") || /^(?:https?:|mailto:)/iu.test(target))
    {
      continue;
    }

    const targetPath = path.resolve(npmRoot, target.split("#", 1)[0]);
    const relative = path.relative(npmRoot, targetPath);

    assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
    await access(targetPath);
  }
});

// Format discovery is hand-maintained in two lists that the filesystem does not
// police: the rollup inputs decide what gets built, and the authored exports map
// decides what a consumer can import. A format missing from either is not a
// build error - it is silently unreachable, which is how `static` shipped with
// neither. The root package manifest is authored; `npm/package.json` is the
// generated publish mirror, so asserting against the copy would only prove the
// build copied its own mistake.
test("every source format is built and exported", async () =>
{
  const formatsRoot = path.join(root, "src", "resource", "formats");
  const entries = await readdir(formatsRoot, { withFileTypes: true });
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const inputs = new Set(rollupConfig.input);
  const names = [];

  for (const entry of entries)
  {
    if (!entry.isDirectory()) continue;

    try
    {
      await access(path.join(formatsRoot, entry.name, "index.js"));
    }
    catch
    {
      continue;
    }

    names.push(entry.name);
  }

  assert.ok(names.length >= 20, `expected the full format tree, saw ${names.length}`);

  for (const name of names)
  {
    assert.ok(
      inputs.has(`src/resource/formats/${name}/index.js`),
      `src/resource/formats/${name}/index.js is not a rollup input, so it will not be built`
    );
    assert.ok(
      Object.hasOwn(manifest.exports, `./resource/formats/${name}`),
      `package.json declares no "./resource/formats/${name}" export, so consumers cannot import it`
    );
  }
});
