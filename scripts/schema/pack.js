#!/usr/bin/env node
// Packs a generated Carbon schema tree into the single file this package reads.
//
// WHY A FILE IN THIS DIRECTORY. The gate used to reach `../tools-core/.scratch`
// for its schema, which is a sibling reach and is not allowed: it works only on
// a machine with the whole organization checked out side by side, and skips in
// silence everywhere else. A package reads npm imports or files in its own
// directory. This is the file.
//
// WHY GZIP. The tree is 1,911 documents and 14.5 MB raw, which as loose files
// would churn 1,911 paths in git on every refresh and keep every version
// forever. One compressed blob is about a tenth of that and one changed file
// per refresh.
//
// Regenerate the tree first (in tools-core: `npm run schema:generate`), then:
//
//   node scripts/schema/pack.js <schema-tree-dir>
//
// The tree path is an ARGUMENT, not a default, so packing is a deliberate act
// by someone who has the tree - and nothing in the gate itself ever looks
// outside this package.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SNAPSHOT = path.join(scriptsRoot, "carbon_schema_latest.gzip");

/** Every `.json` under a directory, relative and slash-separated. */
function jsonFiles(root, base = root)
{
    const out = [];

    for (const entry of fs.readdirSync(root, { withFileTypes: true }))
    {
        const full = path.join(root, entry.name);

        if (entry.isDirectory()) out.push(...jsonFiles(full, base));
        else if (entry.name.endsWith(".json")) out.push(path.relative(base, full).replaceAll("\\", "/"));
    }

    return out;
}


if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1])))
{
    const treeRoot = process.argv[2];

    if (!treeRoot)
    {
        console.error("Usage: node scripts/schema/pack.js <schema-tree-dir>");
        process.exit(2);
    }

    const files = jsonFiles(path.resolve(treeRoot));
    const documents = {};
    for (const file of files) documents[file] = JSON.parse(fs.readFileSync(path.join(treeRoot, file), "utf8"));

    const payload = {
        packedAt: new Date().toISOString(),
        documentCount: files.length,
        documents
    };

    fs.writeFileSync(SNAPSHOT, zlib.gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 }));

    const size = fs.statSync(SNAPSHOT).size;
    console.log(`Packed ${files.length} schema documents into ${path.relative(process.cwd(), SNAPSHOT)} `
        + `(${(size / 1048576).toFixed(1)} MB).`);
}
