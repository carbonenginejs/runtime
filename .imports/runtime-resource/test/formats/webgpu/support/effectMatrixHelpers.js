import { resolve } from "node:path";

function fail(message)
{
    throw new Error(`Effect matrix qualification: ${message}`);
}

/**
 * Reject ambiguous permutation axes before mixed-radix enumeration.
 *
 * @param {Array<object>} axes Effect permutation axes.
 * @returns {true} True for an unambiguous axis set.
 */
export function validateEffectPermutationAxes(axes)
{
    if (!Array.isArray(axes)) throw new TypeError("Effect permutation axes must be an array");
    const names = new Set();
    for (let axisIndex = 0; axisIndex < axes.length; axisIndex += 1)
    {
        const axis = axes[axisIndex];
        if (typeof axis?.name !== "string" || !axis.name)
        {
            throw new TypeError(`Effect permutation axis ${axisIndex} has no name`);
        }
        if (names.has(axis.name)) fail(`duplicate permutation axis ${axis.name}`);
        names.add(axis.name);
        if (!Array.isArray(axis.options) || !axis.options.length)
        {
            throw new TypeError(`Effect permutation axis ${axis.name} has no options`);
        }
        const options = new Set();
        for (const option of axis.options)
        {
            if (typeof option !== "string" || !option)
            {
                fail(`permutation axis ${axis.name} has a non-string or empty option`);
            }
            if (options.has(option)) fail(`permutation axis ${axis.name} has duplicate option ${option}`);
            options.add(option);
        }
    }
    return true;
}

/**
 * Enumerate mixed-radix selections in Carbon body-index order.
 *
 * @param {Array<object>} axes Normalized permutation axes.
 * @returns {Array<object>} Explicit option selections for every body index.
 */
export function enumerateEffectPermutations(axes)
{
    validateEffectPermutationAxes(axes);
    const counts = axes.map((axis) => axis.options.length);
    const bodyCount = counts.reduce((product, count) => product * count, 1);
    return Array.from({ length: bodyCount }, (_, bodyIndex) =>
    {
        let value = bodyIndex;
        const selections = axes.map((axis, axisIndex) =>
        {
            const optionIndex = value % counts[axisIndex];
            value = Math.floor(value / counts[axisIndex]);
            return Object.freeze({
                name: axis.name,
                value: axis.options[optionIndex],
                optionIndex
            });
        });
        return Object.freeze({
            bodyIndex,
            optionIndices: Object.freeze(selections.map((entry) => entry.optionIndex)),
            options: Object.freeze(selections.map(({ name, value: optionValue }) =>
                Object.freeze({ name, value: optionValue })))
        });
    });
}

/**
 * Verify positional effect body offsets.
 *
 * @param {Array<object>} offsets Effect body offset records.
 * @param {number} expectedBodies Permutation product.
 * @returns {object} Exact count/index checks.
 */
export function inspectEffectOffsets(offsets, expectedBodies)
{
    if (!Array.isArray(offsets)) throw new TypeError("Effect body offsets must be an array");
    if (!Number.isInteger(expectedBodies) || expectedBodies < 1)
    {
        throw new TypeError("Expected effect body count must be a positive integer");
    }
    return Object.freeze({
        offsetRecords: offsets.length,
        offsetCountMatch: offsets.length === expectedBodies,
        offsetIndicesMatch: offsets.every((entry, index) => entry?.index === index)
    });
}

/**
 * Parse the direct DX11/DX12 exhaustive-matrix CLI.
 *
 * @param {string[]} args Command arguments without node/script entries.
 * @returns {object} Parsed paths and output options.
 */
export function parseEffectMatrixArguments(args)
{
    if (!Array.isArray(args)) throw new TypeError("Effect matrix arguments must be an array");
    const positionals = [];
    let summary = false;
    let outputPath = null;
    for (let index = 0; index < args.length; index += 1)
    {
        const argument = args[index];
        if (argument === "--summary")
        {
            if (summary) fail("--summary may only be specified once");
            summary = true;
        }
        else if (argument === "--output")
        {
            if (outputPath !== null) fail("--output may only be specified once");
            const value = args[index + 1];
            if (!value || value.startsWith("--")) fail("--output requires a file path");
            outputPath = resolve(value);
            index += 1;
        }
        else if (argument.startsWith("--"))
        {
            fail(`unknown option ${argument}`);
        }
        else
        {
            positionals.push(argument);
        }
    }
    if (positionals.length !== 2)
    {
        fail("usage: qualify-effect-matrix.js [--summary] [--output report.json] <dx11.sm_*> <dx12.sm_*>");
    }
    const dx11Path = resolve(positionals[0]);
    const dx12Path = resolve(positionals[1]);
    const comparablePath = (value) => process.platform === "win32" ? value.toLowerCase() : value;
    if (outputPath && [ dx11Path, dx12Path ].some((inputPath) =>
        comparablePath(inputPath) === comparablePath(outputPath)))
    {
        fail("--output must not overwrite an input effect file");
    }
    return Object.freeze({ dx11Path, dx12Path, outputPath, summary });
}
