import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceIndex, baselineProblems } from "./lib/carbon-source-index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carbonRoot = process.env.CARBON_ROOT ?? "E:/carbonengine";
if (!existsSync(carbonRoot))
{
    console.log("Donor coverage SKIPPED: set CARBON_ROOT to the Carbon source checkout.");
}
else
{
    const { sources, classes, problems } = await sourceIndex(root, carbonRoot);
    let total = 0;
    for (const [ header, { types } ] of sources)
    {
        for (const type of types)
        {
            total++;
            // This is a verified backend identity, not a global suffix heuristic:
            // stub/Tr2ResourceSetALStub.h declares TrinityALImpl::Tr2ResourceSetAL.
            const identity = type.qualifiedName === "TrinityALImpl::Tr2ResourceSetAL"
                ? "Tr2ResourceSetALStub" : type.qualifiedName;
            if (!classes.has(identity)) problems.set(`${header}#${type.qualifiedName}`, `No exact live class declaration for ${type.kind} ${type.qualifiedName} (${header}:${type.line}); review missing port or explicit JS equivalent.`);
        }
    }
    const passed = await baselineProblems(problems, path.join(root, "scripts/donor-coverage-baseline.json"), process.argv.includes("--write"));
    console.log(`Donor coverage: ${sources.size} cited headers, ${total} top-level types, ${problems.size} recorded findings. Nested types and specializations are outside this check.`);
    process.exitCode = passed ? 0 : 1;
}
