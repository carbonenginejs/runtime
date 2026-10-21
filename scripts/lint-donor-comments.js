import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inventoryRuntime } from "./lib/decorator-target-inventory.js";
import { validateDonorComment } from "./lib/carbon-donor-comments.js";

/** Checks class donor JSDoc independently of runtime registration and exposure. */
export function checkDonorComments(root, carbonRoot)
{
    if (!carbonRoot) throw new Error("Set CARBON_ROOT to the Carbon source tree.");
    const inventory = inventoryRuntime(root), findings = [];
    for (const c of inventory.classes) for (const entry of c.donorComments ?? [])
    {
        const error = validateDonorComment(entry, carbonRoot);
        if (error) findings.push({ source: c.source, class: c.name, line: entry.line, error, text: entry.text });
    }
    for (const diagnostic of inventory.diagnostics.filter(d => d.kind === "parse-error"))
        findings.push({ source: diagnostic.source, error: diagnostic.error });
    return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
{
    const root = fileURLToPath(new URL("..", import.meta.url));
    const findings = checkDonorComments(root, process.env.CARBON_ROOT);
    for (const finding of findings) console.error(JSON.stringify(finding));
    console.log(`Class donor comments: ${findings.length} finding(s).`);
    if (findings.length) process.exitCode = 1;
}
