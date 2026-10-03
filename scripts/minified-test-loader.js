// Fail closed: every runtime implementation import is redirected to the
// minified mirror, including imports from child Node processes via NODE_OPTIONS.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const mirror = new URL(".cache/minified-test/dist/", root);
const prefixes = [new URL("src/", root).href, new URL("npm/dist/", root).href];
const files = new Set(JSON.parse(fs.readFileSync(new URL("../files.json", mirror), "utf8")));
files.add("carbonenginejs.min.js");

export async function resolve(specifier, context, nextResolve)
{
    const result = await nextResolve(specifier, context);
    for (const prefix of prefixes)
    {
        if (!result.url.startsWith(prefix)) continue;
        const url = new URL(result.url);
        const relative = decodeURIComponent(url.pathname.slice(new URL(prefix).pathname.length));
        if (!files.has(relative)) throw new Error(`Minified test has no implementation for ${relative}; normal-module fallback refused.`);
        const target = new URL(relative, mirror);
        target.search = url.search;
        target.hash = url.hash;
        if (!fs.existsSync(fileURLToPath(target))) throw new Error(`Missing minified module ${relative}`);
        return { ...result, url: target.href };
    }
    return result;
}

export async function load(url, context, nextLoad)
{
    if (prefixes.some(prefix => url.startsWith(prefix))) throw new Error(`Normal runtime load refused: ${url}`);
    if (url.startsWith(mirror.href))
    {
        const relative = decodeURIComponent(new URL(url).pathname.slice(mirror.pathname.length));
        if (!files.has(relative)) throw new Error(`Unlisted minified module refused: ${relative}`);
    }
    return nextLoad(url, context);
}
