#!/usr/bin/env node
// tools-core owns the checker; this consumer owns its coverage and debt floor.
import fs from "node:fs";
import path from "node:path";
import { collectReport, packageRoot } from "./schema/audit.js";
import { evaluate, updateBaseline } from "./schema/policy.js";

try
{
    const args = process.argv.slice(2);
    if (args.some(arg => !["--json", "--update"].includes(arg))) throw new Error("Usage: node scripts/lint-schema.js [--json] [--update]");
    const update = args.includes("--update");
    if (update) console.error("WARNING: --update banks fixes only. Never use it to silence a fresh finding; investigate against Carbon first.");
    const report = await collectReport();
    const baselineFile = path.join(packageRoot, "scripts/schema-baseline.json");
    const baseline = report.status === "SKIP" ? null : JSON.parse(fs.readFileSync(baselineFile, "utf8"));
    const result = report.status === "SKIP" ? { status: "SKIP", reason: report.reason } : evaluate(report, baseline);
    if (update)
    {
        const next = updateBaseline(report, baseline);
        fs.writeFileSync(baselineFile, JSON.stringify(next, null, 2) + "\n");
    }
    if (args.includes("--json")) console.log(JSON.stringify({ ...result, updated: update }));
    else if (result.status === "SKIP") console.log(`lint:schema SKIPPED - ${result.reason}`);
    else
    {
        const counts = result.counts;
        console.log(`lint:schema ${result.status}: ${counts.checked} classes checked; ${counts.findings} comparison findings; ${counts.gaps} coverage-gap records.`);
        console.log(`Additional native methods outside Blue: ${counts.additionalCarbonMethods} (${counts.additionalCarbonMethodsDelta >= 0 ? "+" : ""}${counts.additionalCarbonMethodsDelta} since baseline), advisory. Known blind spot: Blue cannot distinguish native ports from invented methods.`);
        console.log(`${counts.advisories} advisory records; ${counts.resolved} baseline findings no longer reported. Scanner output is evidence, not authority.`);
        if (result.status === "FAIL")
        {
            for (const name of ["failures", "newFindings", "newGaps", "lostCoverage", "lostMemberCoverage", "lostSchemaCoverage"])
            {
                const entries = result[name];
                if (!entries.length) continue;
                console.error(`${name}: ${entries.length}`);
                for (const entry of entries.slice(0, 20)) console.error(JSON.stringify(entry));
            }
            console.error("Investigate against Carbon. --json shows every finding; --update cannot accept new debt or lost coverage.");
        }
        else if (update) console.log("Schema baseline updated to bank fixes and additional coverage.");
    }
    process.exitCode = result.status === "FAIL" ? 1 : 0;
}
catch (error)
{
    console.error(`lint:schema infrastructure/update failure: ${error.message}`);
    process.exitCode = 2;
}
