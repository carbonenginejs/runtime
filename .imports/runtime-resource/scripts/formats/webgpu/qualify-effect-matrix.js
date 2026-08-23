import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
    parseEffectMatrixArguments,
    qualifyEffectMatrix,
    summarizeEffectMatrix
} from "./effectMatrixQualification.js";

const options = parseEffectMatrixArguments(process.argv.slice(2));
const report = await qualifyEffectMatrix(options.dx11Path, options.dx12Path);
if (options.outputPath)
{
    await mkdir(dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(options.summary ? summarizeEffectMatrix(report) : report, null, 2));
if (report.status !== "qualified") process.exitCode = 1;
