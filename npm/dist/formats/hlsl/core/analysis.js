import { normalizeValues, readRaw, DEFAULT_VALUES } from './helpers.js';
import { resolveSelectedOptions } from './metadata.js';
import { HlslEffectBindingManifest } from './tr2/shader/HlslEffectBindingManifest.js';

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
function analyzeEffectWithValues(input, values) {
  const effectRes = readRaw(input, values);
  const selection = resolveSelectedOptions(effectRes, values.permutation || []);
  let shader = null;
  try {
    shader = effectRes.GetShader(values.permutation || []);
  } catch {
    shader = null;
  }
  const effectDescription = shader ? shader.GetEffectDescription() : null;
  const bindingManifest = effectDescription ? HlslEffectBindingManifest.fromEffectDescription(effectDescription) : null;
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
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} [options] Format values.
 * @returns {{effectRes: object, shader: object|null, selection: object, effectDescription: object|null, bindingManifest: HlslEffectBindingManifest|null}}
 *   Raw loaded effect data plus the resolved permutation context.
 */
function readEffectAnalysis(input, options = {}) {
  return analyzeEffectWithValues(input, normalizeValues(DEFAULT_VALUES, options, "readEffectAnalysis"));
}

export { analyzeEffectWithValues, readEffectAnalysis };
//# sourceMappingURL=analysis.js.map
