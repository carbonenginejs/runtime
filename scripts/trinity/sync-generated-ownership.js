import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGeneratedOwnership, updateOwnershipSummary, assertGeneratedInstallAllowed } from "./generated-ownership.js";

/**
 * Before installing staged generated classes, run --check-install family/ClassName.
 * After a reviewed promotion, run --write, then --check. The refresh derives
 * exclusion ownership from source, preserves the accepted generation artifact,
 * and adds generated-to-maintained transitions to the public parity cohort.
 * Native parity continues to scan all source classes. The public parity audit's
 * --all-owned mode reports the broader historical debt without silently moving
 * its existing ratchet baseline or dropping previously clean audit subjects.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let schemaRoot = process.env.CARBON_SCHEMA_ROOT ?? path.join(root, "../tools-core/.scratch/schema-build");
let mode = "--check", candidate = null;
for (let i = 2; i < process.argv.length; i++)
{
  const argument = process.argv[i];
  if (argument === "--schema-root")
  {
    schemaRoot = process.argv[++i];
    if (!schemaRoot || schemaRoot.startsWith("--")) throw new Error("--schema-root requires a directory");
  }
  else if (argument === "--check" || argument === "--write") mode = argument;
  else if (argument === "--check-install")
  {
    mode = argument;
    candidate = process.argv[++i];
    if (!candidate || !candidate.includes("/") || candidate.startsWith("--")) throw new Error("--check-install requires family/ClassName");
  }
  else throw new Error(`Unknown option ${argument}`);
}

const summaryFile = path.join(root, "src/trinity/generated/summary.json");
const previous = JSON.parse(await fs.readFile(summaryFile, "utf8"));
// This accepted generation artifact contains schema-specific exclusions for
// identities with no source yet, and canonical-family/enum collision decisions.
// Keep it unchanged; it is historical policy evidence, not live source inventory.
const reservations = previous.generation?.skipped ?? [];
const inventory = await readGeneratedOwnership({ sourceRoot: path.join(root, "src"), schemaRoot: path.resolve(schemaRoot) });
if (mode === "--check-install")
{
  const split = candidate.lastIndexOf("/");
  assertGeneratedInstallAllowed(inventory, candidate.slice(split + 1), candidate.slice(0, split), reservations);
  console.log(`Generated install ownership allowed: ${candidate}`);
}
else if (mode === "--write")
{
  await fs.writeFile(summaryFile, `${JSON.stringify(updateOwnershipSummary(previous, inventory), null, 2)}\n`);
  console.log("Regenerated live Trinity ownership; historical generation provenance retained.");
}
else
{
  const expected = updateOwnershipSummary(previous, inventory);
  if (JSON.stringify(previous) !== JSON.stringify(expected))
    throw new Error("Stale generated ownership summary; run node scripts/trinity/sync-generated-ownership.js --write");
  console.log(`Generated ownership checked: ${inventory.records.size} identities across runtime layers.`);
}
