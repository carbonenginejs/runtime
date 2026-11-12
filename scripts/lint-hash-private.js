// Refuses JavaScript `#` private fields and methods in runtime/src. Every
// private is a leading-underscore member instead, so the keep-alive walk and
// other generic checks can reach it: a `#` field holding a resource is
// invisible to them.
//
// HOW THE HELD LIST WORKS. Files listed in HELD still carry `#` privates for a
// recorded reason (a name clash with an existing `_` member, or a lint that
// the rename would newly expose). A held file may only go down; a file not
// listed may have none. Remove a file's entry when it is converted.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { UNSHIPPED_SOURCE_DIRS } from "./lib/unshipped-source.js";

const traverse = traverseModule.default ?? traverseModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");

/** Files still holding `#` privates, with the count of declarations allowed. */
const HELD = {
    "src/audio/trinity/audio/AudListener.js": 5,
    "src/blue/schema/CjsSchema.js": 5,
    "src/trinity/core/lighting/Tr2ShLightingManager.js": 9,
    "src/trinity/core/rawData/RawData.js": 12,
    "src/trinity/core/tool/Tr2RotationTool.js": 10,
    "src/trinity/core/Tr2Renderer.js": 18,
    "src/trinity/core/Tr2TextureArray/Tr2TextureArray.js": 1,
    "src/trinity/particle/attribute/Tr2CapsuleShapeAttributeGenerator.js": 5
};

/**
 * Lists the .js files under a directory, skipping unshipped source folders.
 * @param {string} directory Absolute directory to walk.
 * @returns {string[]} Absolute file paths.
 */
function SourceFiles(directory)
{
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory() && !UNSHIPPED_SOURCE_DIRS.has(entry.name)) files.push(...SourceFiles(target));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
    }
    return files;
}

const problems = [];
let held = 0;
for (const file of SourceFiles(sourceRoot))
{
    const relativeFile = path.relative(root, file).split(path.sep).join("/");
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes("#")) continue;

    const ast = parse(source, { sourceType: "module", plugins: [ "decorators" ], sourceFilename: relativeFile });
    const lines = [];
    traverse(ast, {
        "ClassPrivateProperty|ClassPrivateMethod"(p) { lines.push(p.node.loc.start.line); }
    });

    const allowed = HELD[relativeFile] ?? 0;
    held += Math.min(lines.length, allowed);
    if (lines.length > allowed)
    {
        problems.push(`${relativeFile}: ${lines.length} # private declaration(s) (lines ${lines.join(", ")}), allowed ${allowed}. `
            + "Use a leading underscore: _name, never #name.");
    }
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} file(s) with # privates. Rule: privates are _name so generic walks can reach them.`);
    process.exit(1);
}
console.log(`hash-private: no # privates outside the held list (${held} held in ${Object.keys(HELD).length} files).`);
