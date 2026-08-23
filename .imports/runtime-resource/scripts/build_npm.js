import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmRoot = path.join(root, "npm");

async function copyFileIfExists(name)
{
  try
  {
    await fs.copyFile(path.join(root, name), path.join(npmRoot, name));
  }
  catch (error)
  {
    if (error.code !== "ENOENT")
    {
      throw error;
    }
  }
}

await fs.mkdir(npmRoot, { recursive: true });
await fs.rm(path.join(npmRoot, "dist"), { recursive: true, force: true });
await fs.copyFile(path.join(root, "npm.package.json"), path.join(npmRoot, "package.json"));

for (const file of [
  "README.md",
  "LICENSE",
  "NOTICE"
])
{
  await copyFileIfExists(file);
}

// Public documentation ships in the npm artifact by default; the docs tree
// carries the normative format/provenance contracts.
await fs.rm(path.join(npmRoot, "docs"), { recursive: true, force: true });
await fs.cp(path.join(root, "docs"), path.join(npmRoot, "docs"), {
  recursive: true,
  force: true
});

await fs.cp(path.join(root, "format-notices"), path.join(npmRoot, "format-notices"), {
  recursive: true,
  force: true
});

console.log("runtime-resource npm package metadata refreshed -> npm/");
