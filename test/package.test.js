import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmRoot = path.join(root, "npm");

test("published package exposes every declared subpath", async () =>
{
  const manifest = JSON.parse(await readFile(path.join(npmRoot, "package.json"), "utf8"));

  for (const [subpath, target] of Object.entries(manifest.exports))
  {
    const targetPath = path.resolve(npmRoot, target);
    await access(targetPath);
    const exports = await import(pathToFileURL(targetPath).href);

    assert.ok(exports && typeof exports === "object", `${subpath} must import from ${target}`);
  }
});

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
