#!/usr/bin/env node
// Keeps the format readers' JSDoc complete for IntelliSense: runs the shared
// `cjs-jsdoc audit --strict` over src/resource/format/ and src/resource/formats/
// and fails on any incomplete member (a one-line JSDoc, a missing @param, a
// missing @returns, a misspelled tag or a capitalised primitive type).
//
// The auditor lives in the private `docs` repository beside this one, as the
// documentation checker does (see lint-docs.js), so it may be absent; then this
// says why it skipped rather than passing silently.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditor = path.resolve(packageRoot, "../docs/tooling/bin/cjs-jsdoc.js");
const SCOPES = [ "src/resource/format/", "src/resource/formats/" ];

if (!existsSync(auditor))
{
    console.log(
        "lint:format-jsdoc SKIPPED - the shared JSDoc auditor was not found at\n"
        + `  ${auditor}\n`
        + "It lives in the organization's private docs repository. Check that out\n"
        + "beside this package to run it.");
    process.exit(0);
}

let failed = false;

for (const scope of SCOPES)
{
    const result = spawnSync(process.execPath, [ auditor, "audit", ".", "--strict", "--list", "--path", scope ],
        { cwd: packageRoot, encoding: "utf8" });

    if (result.status === 0) continue;

    failed = true;
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
}

if (failed)
{
    console.error("lint:format-jsdoc: format JSDoc is incomplete; complete the members listed above.");
    process.exit(1);
}

console.log(`Format JSDoc complete (strict): ${SCOPES.join(", ")}`);
