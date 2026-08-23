#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import CjsHlslFormat from "../../../src/formats/hlsl/index.js";

const COMMAND_METADATA = "metadata";

/**
 * Gets the default metadata output path for an input effect file.
 *
 * @param {string} inputPath Resolved input file path.
 * @returns {string} Output JSON path in the current working directory.
 */
function defaultMetadataOutputPath(inputPath)
{
    const parsed = path.parse(inputPath);
    return path.join(process.cwd(), `${parsed.name}.json`);
}

/**
 * Prints command usage.
 *
 * @param {number} exitCode Process exit code.
 */
function usage(exitCode)
{
    const out = exitCode ? process.stderr : process.stdout;
    out.write([
        "Usage:",
        "  npm run metadata:hlsl -- <input-file> [out-json-file]",
        "",
        "Commands:",
        "  metadata  Read compact shader metadata JSON from a compiled Tr2 effect file.",
        "",
        "When out-json-file is omitted, output is written to <cwd>/<input-name>.json.",
        ""
    ].join("\n"));
    process.exit(exitCode);
}

/**
 * Runs the metadata command.
 *
 * @param {string[]} args Command arguments.
 */
async function runMetadata(args)
{
    const [ inputPath, outputPath, ...rest ] = args;
    if (!inputPath || rest.length)
    {
        usage(1);
    }

    const resolvedInput = path.resolve(inputPath);
    const resolvedOutput = outputPath
        ? path.resolve(outputPath)
        : defaultMetadataOutputPath(resolvedInput);

    const input = await readFile(resolvedInput);
    const metadata = CjsHlslFormat.read(input, {
        emit: CjsHlslFormat.OUTPUT_METADATA,
        source: resolvedInput
    });

    await mkdir(path.dirname(resolvedOutput), { recursive: true });
    await writeFile(resolvedOutput, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    process.stdout.write(`${resolvedOutput}\n`);
}

/**
 * CLI entry point.
 *
 * @param {string[]} argv Process arguments without node/script entries.
 */
async function main(argv)
{
    const [ command, ...args ] = argv;
    if (!command || command === "-h" || command === "--help")
    {
        usage(0);
    }

    if (command !== COMMAND_METADATA)
    {
        process.stderr.write(`Unknown command: ${command}\n`);
        usage(1);
    }

    await runMetadata(args);
}

main(process.argv.slice(2)).catch((error) =>
{
    process.stderr.write(`${error?.stack || error?.message || error}\n`);
    process.exitCode = 1;
});
