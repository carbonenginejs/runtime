import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmRoot = path.join(root, "npm");

function rewriteTargets(value)
{
    if (typeof value === "string")
    {
        return value.replace(/^\.\/src\//u, "./dist/");
    }
    if (Array.isArray(value)) return value.map(rewriteTargets);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, target ]) => [ key, rewriteTargets(target) ]));
    }
    return value;
}

async function resetNpmRoot()
{
    try
    {
        const stat = await fs.lstat(npmRoot);
        if (stat.isSymbolicLink()) throw new Error("Refusing to replace a linked npm output directory");
        await fs.rm(npmRoot, { recursive: true });
    }
    catch (error)
    {
        if (error.code !== "ENOENT") throw error;
    }
    await fs.mkdir(npmRoot, { recursive: true });
}

await resetNpmRoot();

const sourceManifest = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const npmManifest = {
    ...sourceManifest,
    exports: rewriteTargets(sourceManifest.exports),
    imports: rewriteTargets(sourceManifest.imports),
    files: [
        "dist",
        "docs",
        "format-notices",
        "migration",
        "README.md",
        "LICENSE",
        "NOTICE",
        "THIRD-PARTY-NOTICES.md"
    ]
};

delete npmManifest.devDependencies;
delete npmManifest.scripts;

await fs.writeFile(path.join(npmRoot, "package.json"), `${JSON.stringify(npmManifest, null, 2)}\n`, "utf8");

for (const name of [ "README.md", "LICENSE", "NOTICE", "THIRD-PARTY-NOTICES.md" ])
{
    await fs.copyFile(path.join(root, name), path.join(npmRoot, name));
}

// The stylesheets left with the demo suite on 2026-08-30. Nothing the runtime
// still ships has a presentation surface, so there is no CSS to copy.

await fs.cp(path.join(root, "docs"), path.join(npmRoot, "docs"), { recursive: true });
await fs.cp(path.join(root, "format-notices"), path.join(npmRoot, "format-notices"), { recursive: true });
await fs.cp(path.join(root, "migration"), path.join(npmRoot, "migration"), { recursive: true });

console.log("combined runtime npm metadata refreshed -> npm/");
