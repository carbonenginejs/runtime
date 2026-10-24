import { DEFAULT_VALUES, normalizeValues, readRaw, resolveDescription } from "./helpers.js";
import { resolveSelectedOptions } from "./metadata.js";
import { buildEffectBindingManifest } from "../../../format/effect/effectBindingManifest.js";
import { effectHeader } from "../../../format/effect/effectHeader.js";

/**
 * Resolve a container's explicitly selected permutation for CPU tooling.
 * @param {ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
 * @param {object} values Normalized format values.
 * @returns {object} Reader, header, selection, description and binding manifest.
 */
export function analyzeEffectWithValues(input, values)
{
    const reader = readRaw(input, values);
    const header = effectHeader(reader);
    const selection = resolveSelectedOptions(reader, values.permutation || []);
    const effectDescription = resolveDescription(reader, values);
    const bindingManifest = effectDescription
        ? buildEffectBindingManifest(effectDescription, { version: header.version, effectName: values.source })
        : null;
    return { reader, header, selection, effectDescription, bindingManifest };
}

/**
 * Analyze bytes without constructing resources or consulting runtime effect options.
 * @param {ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
 * @param {object} [options] Source label and explicit permutation choices.
 * @returns {object} CPU analysis; reader retains the bytes for further permutations.
 */
export function readEffectAnalysis(input, options = {})
{
    return analyzeEffectWithValues(input, normalizeValues(DEFAULT_VALUES, options, "readEffectAnalysis"));
}
