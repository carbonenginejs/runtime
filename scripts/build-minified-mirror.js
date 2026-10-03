// An isolated minified per-file mirror preserves cold-import and private-entry
// tests which cannot be represented by the package's narrower public root.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import { minifyOptions } from "./minify-options.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "npm/dist");
const mirror = path.join(root, ".cache/minified-test");
const assets = [];
async function collect(directory)
{
    const result = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true }))
    {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...await collect(file));
        else if (file.endsWith(".js") && entry.name !== "carbonenginejs.min.js") result.push(file);
        else if (file.endsWith(".json")) assets.push(file);
    }
    return result;
}
await fs.mkdir(path.join(mirror, "dist"), { recursive: true });
await fs.copyFile(path.join(root, "npm/package.json"), path.join(mirror, "package.json"));
// Build every authored module as an entry. Rollup's production graph intentionally
// drops private exports; deep source tests must retain those exports here.
const sourceRoot = path.join(root, "src");
const files = await collect(sourceRoot);
await build({ ...minifyOptions, entryPoints: files, outbase: sourceRoot,
    outdir: path.join(mirror, "dist"), bundle: false, logLevel: "warning",
    plugins: [{ name: "same-stage3-decorators-as-rollup", setup(build) {
        build.onLoad({ filter: /\.js$/ }, async ({path: file}) => {
            const code = await fs.readFile(file, "utf8");
            if (!/^\s*@/m.test(code) && !/\.json["']/.test(code)) return;
            const result = await transformAsync(code, { filename: file,
                babelrc: false, configFile: false, sourceMaps: "inline",
                plugins: [["@babel/plugin-proposal-decorators", {version: "2023-11"}],
                    () => ({visitor: {ImportDeclaration(p) {
                        if (p.node.source.value.endsWith(".json")) {
                            p.node.source.value += ".js";
                            p.node.attributes = [];
                        }
                    }}})] });
            return { contents: result.code, loader: "js", resolveDir: path.dirname(file) };
        });
    } }]
});
await build({ ...minifyOptions, entryPoints: assets, outbase: sourceRoot,
    outdir: path.join(mirror, "dist"), outExtension: {".js": ".json.js"}, bundle: false });
for (const asset of assets)
{
    const target = path.join(mirror, "dist", path.relative(sourceRoot, asset));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(asset, target);
}
// The bundle tests load the exact shipped bytes, not a second transformation.
for (const suffix of ["", ".map"])
    await fs.copyFile(path.join(dist, `carbonenginejs.min.js${suffix}`), path.join(mirror, `dist/carbonenginejs.min.js${suffix}`));
await fs.writeFile(path.join(mirror, "files.json"), JSON.stringify([...files, ...assets, ...assets.map(file => file + ".js")].map(file => path.relative(sourceRoot, file).replaceAll("\\", "/"))));
console.log(`Minified test mirror: ${files.length} modules; no keepNames.`);
