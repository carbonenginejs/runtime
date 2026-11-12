// Runs every lint step and reports all failures together.
//
// The steps used to be one `&&` chain in package.json, so the first failure hid
// every later step, and several baselines went unenforced for weeks. This runs
// each step whatever the last one did, then names every step that failed and
// exits non-zero if any did.
//
//   node scripts/run-lint.js            every step
//   node scripts/run-lint.js layers ... only the named steps

import { spawnSync } from "node:child_process";

/** The lint steps, in the order the chain ran them. Each is an npm script name. */
const STEPS = [
    "lint:layers",
    "lint:device-imports",
    "lint:source",
    "lint:optional-calls",
    "lint:undeclared-fields",
    "lint:instanceof",
    "lint:constructor-name",
    "lint:hash-private",
    "lint:list-members",
    "lint:private-references",
    "lint:typed-array-alloc",
    "lint:carbon-methods",
    "lint:exposure-bags",
    "lint:exposure-chains",
    "lint:class-shape",
    "lint:destruct-hooks",
    "lint:class-file-naming",
    "lint:donor-comments",
    "lint:marker-tags",
    "lint:donor-coverage",
    "lint:enum-parity",
    "lint:struct-defaults",
    "lint:al-parity",
    "lint:al-contract",
    "lint:trinity",
    "audit:trinity:parity",
    "lint:docs",
    "lint:format-jsdoc",
    "lint:module-exports"
];

const requested = process.argv.slice(2).map(name => (name.includes(":") ? name : `lint:${name}`));
const unknown = requested.filter(name => !STEPS.includes(name));
if (unknown.length)
{
    console.error(`Unknown lint step(s): ${unknown.join(", ")}`);
    process.exit(2);
}

const steps = requested.length ? requested : STEPS;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const failed = [];

for (const step of steps)
{
    console.log(`\n=== ${step}`);
    const result = spawnSync(npm, [ "run", "-s", step ], { stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) failed.push(`${step} (exit ${result.status ?? result.signal})`);
}

console.log(`\n=== lint: ${steps.length - failed.length} of ${steps.length} steps passed`);
if (failed.length)
{
    console.log(`Failed:\n  ${failed.join("\n  ")}`);
    process.exit(1);
}
