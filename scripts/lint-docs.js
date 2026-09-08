#!/usr/bin/env node
// Runs the organization's shared documentation checker over this package.
//
// The checker lives in the private `docs` repository beside this one, not in
// this package, because it is shared by every package in the organization. So
// it may genuinely be absent - a consumer installing from npm has no sibling
// checkout - and a missing checker must not fail the lint chain. It says why
// it skipped rather than passing silently, because a check that quietly does
// nothing is the failure this whole wiring exists to fix: cjs-docs-check was
// never in any script until 2026-09-08, and 102 errors accumulated unseen.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.resolve(packageRoot, "../docs/tooling/bin/cjs-docs-check.js");

if (!existsSync(checker))
{
    console.log(
        "lint:docs SKIPPED - the shared documentation checker was not found at\n"
        + `  ${checker}\n`
        + "It lives in the organization's private docs repository. Check that out\n"
        + "beside this package to run it.");
    process.exit(0);
}

const result = spawnSync(process.execPath, [ checker ], { stdio: "inherit", cwd: packageRoot });
process.exit(result.status ?? 1);
