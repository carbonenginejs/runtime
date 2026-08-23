#!/usr/bin/env node
import { validateLayering } from "./layering.js";

const result = await validateLayering();

if (result.problems.length)
{
    for (const problem of result.problems) console.error(`  ${problem}`);
    console.error(`\n${result.problems.length} layering violation(s).`);
    process.exitCode = 1;
}
else
{
    console.log(`Layering OK: ${result.layerCount} layers, no violations.`);
}
