// The resolver and warning policy every browser bundle shares: `#` subpaths and
// bare specifiers resolve through npm/, and an unresolved import fails the build.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const packageRequire = createRequire(new URL("./npm/package.json", import.meta.url));

function isBareSpecifier(value)
{
    return !value.startsWith(".") && !value.startsWith("/") && !path.isAbsolute(value);
}

function resolveBrowserModule(source)
{
    if (source.startsWith("gl-matrix/")) return packageRequire.resolve(source);

    const resolved = packageRequire.resolve(source);
    const packageName = source.startsWith("@")
        ? source.split("/").slice(0, 2).join("/")
        : source.split("/")[0];
    // A PACKAGE NEED NOT EXPORT ITS OWN MANIFEST, and several modern ones do
    // not: `meshoptimizer` has an `exports` map without a "./package.json"
    // entry, so resolving it throws and took the whole bundle down. The manifest
    // is only consulted to prefer an ESM `module` entry over what `resolve`
    // picked, which is an optimisation - when it cannot be read, what `resolve`
    // returned is already a working answer.
    let manifestPath = null;
    let manifest = null;

    try
    {
        manifestPath = packageRequire.resolve(`${packageName}/package.json`);
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    }
    catch
    {
        return resolved;
    }

    if (source === packageName && manifest.module)
    {
        return path.resolve(path.dirname(manifestPath), manifest.module);
    }
    return resolved;
}

function runtimeResolver()
{
    return {
        name: "carbon-runtime-browser-resolver",
        resolveId(source)
        {
            if (source.startsWith("node:"))
            {
                throw new Error(`A browser bundle cannot import ${source}`);
            }
            if (source.startsWith("#")) return packageRequire.resolve(source);
            if (isBareSpecifier(source)) return resolveBrowserModule(source);
            return null;
        }
    };
}

export const shared = {
    onwarn(warning, warn)
    {
        if (warning.code === "UNRESOLVED_IMPORT")
        {
            throw new Error(`Unresolved WebGPU import: ${warning.source}`);
        }
        warn(warning);
    },
    plugins: [ runtimeResolver() ]
};
