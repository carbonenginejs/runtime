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

// THE REGISTRY FIELDS LIVE IN `npm.package.json`, never here and never in the
// generated `npm/package.json`, which this script overwrites
// (`docs/standards/versioning-and-publishing.md`). `private: true` on the source
// manifest is a GUARD that stops a publish at the repository root from shipping
// `src`, decorators and scratch; the publish manifest is what lifts it.
//
// Only registry fields belong in that file. The export and import maps stay
// GENERATED from the source manifest, because there are roughly two hundred
// subpaths and a hand-copied second map is precisely the silent drift the
// standard was written about - three donors shipped `^0.16.0` against a 0.18.0
// sibling that way, and every one had to be found by opening the file.
const publishManifest = JSON.parse(await fs.readFile(path.join(root, "npm.package.json"), "utf8"));

if (publishManifest.exports || publishManifest.imports)
{
    throw new Error("npm.package.json must not declare exports or imports; both are generated from package.json");
}

// ONE PACKAGE HAS ONE VERSION. The version stays in `package.json` so there is
// no second place for it to skew from; the donors' matching-version lint existed
// because they had two. A publish manifest that carries its own would reopen
// exactly that gap.
if (publishManifest.version)
{
    throw new Error("npm.package.json must not declare a version; it is taken from package.json");
}

const npmManifest = {
    ...sourceManifest,
    ...publishManifest,
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
