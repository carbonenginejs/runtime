import { resolve } from "node:path";

import {
    buildWgslSelectionMetadata,
    selectEffectStages,
    validateResolvedPermutation
} from "../../../../src/resource/formats/webgpu/core/packageEffectSelection.js";

export { buildWgslSelectionMetadata, validateResolvedPermutation };
export const selectPackageEffectStages = selectEffectStages;

const STAGE_NAMES = new Set([ "vertex", "pixel", "compute" ]);
const PERMUTATION_PATTERN = /^([^=\s]+)=([^=\s]+)$/u;

function requireValue(args, index, flag)
{
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    return value;
}

function parsePermutationValue(value)
{
    const match = PERMUTATION_PATTERN.exec(value);
    if (!match)
    {
        throw new Error("--permutation requires an exact NAME=VALUE pair without whitespace");
    }
    return Object.freeze({ name: match[1], value: match[2] });
}

/**
 * Parse the strict package-effect command line without silently dropping an
 * invalid selector.
 *
 * @param {string[]} args Command-line arguments after node/script.
 * @returns {object} Parsed input/output and optional selection.
 */
export function parsePackageEffectArguments(args)
{
    const positionals = [];
    let techniqueName = null;
    let passIndex = null;
    const stageNames = [];
    const permutation = [];
    const permutationNames = new Set();
    let overwrite = false;
    for (let index = 0; index < args.length; index += 1)
    {
        const argument = args[index];
        if (argument === "--technique")
        {
            if (techniqueName !== null) throw new Error("--technique may only be specified once");
            techniqueName = requireValue(args, index, argument);
            index += 1;
        }
        else if (argument === "--pass")
        {
            if (passIndex !== null) throw new Error("--pass may only be specified once");
            const value = requireValue(args, index, argument);
            if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) throw new Error("--pass requires a non-negative integer");
            passIndex = Number(value);
            index += 1;
        }
        else if (argument === "--stage")
        {
            const value = requireValue(args, index, argument);
            if (!STAGE_NAMES.has(value)) throw new Error(`--stage does not support ${value}`);
            if (stageNames.includes(value)) throw new Error(`--stage ${value} is duplicated`);
            stageNames.push(value);
            index += 1;
        }
        else if (argument === "--permutation")
        {
            const entry = parsePermutationValue(requireValue(args, index, argument));
            if (permutationNames.has(entry.name))
            {
                throw new Error(`--permutation duplicates axis ${entry.name}`);
            }
            permutationNames.add(entry.name);
            permutation.push(entry);
            index += 1;
        }
        else if (argument === "--overwrite" || argument === "--force")
        {
            overwrite = true;
        }
        else if (argument.startsWith("-"))
        {
            throw new Error(`Unknown package-effect option ${argument}`);
        }
        else
        {
            positionals.push(argument);
        }
    }
    if (positionals.length !== 2)
    {
        throw new Error("Usage: node scripts/package-effect.js <input.sm_*> <output.carbonwebgpu> [--overwrite|--force] [--permutation NAME=VALUE ...] [--technique <name> [--pass <index> [--stage vertex --stage pixel|compute]]]");
    }
    if (passIndex !== null && techniqueName === null) throw new Error("--pass requires --technique");
    if (stageNames.length && (techniqueName === null || passIndex === null))
    {
        throw new Error("--stage requires --technique and --pass");
    }
    const selection = techniqueName === null ? null : Object.freeze({
        techniqueName,
        passIndex,
        stageNames: Object.freeze(stageNames)
    });
    return Object.freeze({
        inputArgument: positionals[0],
        outputArgument: positionals[1],
        permutation: Object.freeze(permutation),
        selection,
        overwrite
    });
}

/**
 * Prevent a package output from replacing its compiled-effect input.
 *
 * @param {string} inputPath Resolved or relative input path.
 * @param {string} outputPath Resolved or relative output path.
 * @param {string} [platform] Platform used for path comparison.
 * @returns {true} True when the paths are distinct.
 */
export function validatePackageEffectPaths(inputPath, outputPath, platform = process.platform)
{
    const normalize = (value) =>
    {
        const path = resolve(value);
        return platform === "win32" ? path.toLowerCase() : path;
    };
    if (normalize(inputPath) === normalize(outputPath))
    {
        throw new Error("Package effect output must not overwrite the input effect file");
    }
    return true;
}

/**
 * Prove that ANLS metadata and the separately resolved bytecode body use the
 * same mixed-radix selection before any shader bytes are packaged.
 *
 * @param {object} analysis Selected-body Carbon WebGPU diagnostic analysis.
 * @param {object} selection Bytecode reader selection.
 * @returns {true} True when both resolutions are identical.
 */
export function validateMatchingEffectResolution(analysis, selection)
{
    if (!analysis || !selection || analysis.bodyIndex !== selection.bodyIndex)
    {
        throw new Error("Package effect analysis and bytecode body indices do not match");
    }
    const compact = (entries) => (Array.isArray(entries) ? entries : []).map((entry) => ({
        name: entry?.name,
        value: entry?.value,
        optionIndex: entry?.optionIndex
    }));
    if (JSON.stringify(compact(analysis.selectedOptions)) !== JSON.stringify(compact(selection.selectedOptions)))
    {
        throw new Error("Package effect analysis and bytecode selections do not match");
    }
    return true;
}
