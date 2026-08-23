import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import CjsFormatWebgpu from "../../../../src/resource/formats/webgpu/index.js";
import {
    parsePackageEffectArguments,
    validatePackageEffectPaths
} from "./packageEffectSelection.js";

const { inputArgument, outputArgument, permutation, selection, overwrite } = parsePackageEffectArguments(process.argv.slice(2));

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
validatePackageEffectPaths(inputPath, outputPath);

if (!overwrite)
{
    try
    {
        await access(outputPath);
        throw new Error(`Carbon WebGPU output already exists; pass --overwrite to replace it: ${outputPath}`);
    }
    catch (error)
    {
        if (error?.code !== "ENOENT") throw error;
    }
}

const input = await readFile(inputPath);
const result = CjsFormatWebgpu.buildEffect(input, {
    source: inputPath,
    permutation,
    selection
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, result.bytes);
console.log(
    `Wrote ${outputPath} (${result.bytes.length} bytes, `
    + `${result.wgsl.shaders.length} shaders, ${result.wgsl.layouts.length} layouts)`
);
