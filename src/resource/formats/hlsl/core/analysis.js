import { DEFAULT_VALUES, normalizeValues, readRaw } from "./helpers.js";
import { resolveSelectedOptions } from "./metadata.js";
import { HlslEffectBindingManifest } from "./tr2/shader/HlslEffectBindingManifest.js";

/**
 * Resolve one permutation to the raw effect/shader/manifest context that
 * downstream translation tooling needs.
 *
 * This is intentionally an advanced helper: it returns internal graph objects
 * rather than the stable JSON contract exposed by `CjsHlslFormat`.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} values Normalized format values.
 * @returns {{effectRes: object, shader: object|null, selection: object, effectDescription: object|null, bindingManifest: HlslEffectBindingManifest|null}}
 *   Raw loaded effect data plus the resolved permutation context.
 */
export function analyzeEffectWithValues(input, values)
{
    const effectRes = readRaw(input, values);
    const selection = resolveSelectedOptions(effectRes, values.permutation || []);

    let shader = null;
    try
    {
        shader = effectRes.GetShader(values.permutation || []);
    }
    catch
    {
        shader = null;
    }

    const effectDescription = shader ? shader.GetEffectDescription() : null;
    const bindingManifest = effectDescription
        ? HlslEffectBindingManifest.fromEffectDescription(effectDescription)
        : null;

    return {
        effectRes,
        shader,
        selection,
        effectDescription,
        bindingManifest
    };
}

/**
 * Advanced one-shot helper for tooling that needs one parse plus one binding
 * manifest build without changing the stable reader emits.
 *
 * The result shape may change without a major version; the supported data
 * interfaces are `CjsHlslFormat.read` with `emit: "json"` or `"metadata"`.
 * `bindingManifest` holds register-named constant, resource, sampler and UAV
 * bindings; its class is not exported, so treat it as data. The returned
 * `effectRes.GetShaderByIndex(index)` decodes one exact permutation-table slot
 * without global or local option overrides, so a body-table index stays stable
 * when global effect options are set. It returns an internal `HlslShader`, not
 * the `Tr2Shader` the canonical `Tr2EffectRes.GetShaderByIndex` hydrates.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} [options] Format values.
 * @returns {{effectRes: object, shader: object|null, selection: object, effectDescription: object|null, bindingManifest: HlslEffectBindingManifest|null}}
 *   Raw loaded effect data plus the resolved permutation context.
 */
export function readEffectAnalysis(input, options = {})
{
    return analyzeEffectWithValues(input, normalizeValues(DEFAULT_VALUES, options, "readEffectAnalysis"));
}
