import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dependencies = new Set(Object.keys(manifest.dependencies ?? {}));
const unpublishedInputs = new Set([
    "src/trinity/generated/eve/EveDamageOverlay.js",
    "src/trinity/generated/eve/EveModularObjectModifier.js"
]);

function collectTargets(value, out = [])
{
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(entry => collectTargets(entry, out));
    else if (value && typeof value === "object") Object.values(value).forEach(entry => collectTargets(entry, out));
    return out;
}

function collectFiles(directory)
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(target) : [ target ];
    });
}

function expandTarget(target)
{
    const star = target.indexOf("*");
    if (star === -1) return [ target.slice(2) ];

    const relativeTarget = target.slice(2);
    const before = relativeTarget.slice(0, relativeTarget.indexOf("*"));
    const directory = path.resolve(root, before.endsWith("/") ? before : path.dirname(before));
    if (!fs.existsSync(directory)) return [];

    const pattern = new RegExp(`^${relativeTarget
        .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
        .replaceAll("*", ".*")}$`, "u");

    return collectFiles(directory)
        .map(file => path.relative(root, file).replaceAll(path.sep, "/"))
        .filter(file => pattern.test(file));
}

const input = Array.from(new Set(collectTargets(manifest.exports).flatMap(expandTarget)))
    .filter(target => !unpublishedInputs.has(target));

function packageName(id)
{
    const parts = id.split("/");
    return id.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export default {
    input,
    external: id => id.startsWith("#") || id.startsWith("node:") || dependencies.has(packageName(id)),
    output: {
        dir: "npm/dist",
        format: "esm",
        preserveModules: true,
        preserveModulesRoot: "src",
        sourcemap: true
    },
    plugins: [
        json({ compact: true }),
        babel({
            babelHelpers: "bundled",
            extensions: [ ".js" ],
            babelrc: false,
            configFile: false,
            plugins: [
                [ "@babel/plugin-proposal-decorators", { version: "2023-11" } ]
            ]
        })
    ]
};
