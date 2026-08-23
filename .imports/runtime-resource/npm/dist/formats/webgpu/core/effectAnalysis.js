import { readEffectAnalysis as readEffectAnalysis$1 } from '../../hlsl/core/analysis.js';

/**
 * Copy supported byte containers into an independent active byte view.
 *
 * @param {Array|ArrayBuffer|ArrayBufferView|null|undefined} value Byte source.
 * @param {string} context Error context.
 * @returns {Uint8Array|null} Copied bytes, or null when absent.
 */
function normalizeBytecodeBytes(value, context) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index) || !Number.isInteger(value[index]) || value[index] < 0 || value[index] > 255) {
        throw new TypeError(`${context} must contain only byte values`);
      }
    }
    return Uint8Array.from(value);
  }
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  throw new TypeError(`${context} must be an array or byte view`);
}
function collectStageBytecodeByKey(effectDescription) {
  const bytecodeByKey = new Map();
  for (const technique of effectDescription?.techniques ?? []) {
    for (let passIndex = 0; passIndex < technique.passes.length; passIndex++) {
      const stageInputs = technique.passes[passIndex].stageInputs;
      for (let stageType = 0; stageType < stageInputs.length; stageType++) {
        const stage = stageInputs[stageType];
        if (!stage?.m_exists) continue;
        const stageName = stage.cjsShaderBytecode?.stageName;
        const bytecodeStageType = stage.cjsShaderBytecode?.stageType;
        const value = stage.cjsShaderBytecode?.bytes;
        if (!stageName || value === undefined || value === null) continue;
        if (!Number.isInteger(bytecodeStageType) || bytecodeStageType !== stageType) {
          throw new Error(`${technique.name}.pass${passIndex}.${stageName} stage type metadata is inconsistent`);
        }
        const key = `${technique.name}.pass${passIndex}.${stageName}`;
        if (bytecodeByKey.has(key)) {
          throw new Error(`Resolved effect contains duplicate stage bytecode ${key}`);
        }
        const bytes = normalizeBytecodeBytes(value, `${key} stage bytecode`);
        if (!bytes?.length) {
          throw new TypeError(`${key} stage bytecode must be a non-empty byte view`);
        }
        bytecodeByKey.set(key, {
          techniqueName: technique.name,
          passIndex,
          stageType,
          stageName,
          bytes
        });
      }
    }
  }
  return bytecodeByKey;
}

/**
 * Resolve one compiled-effect permutation for WebGPU packaging.
 *
 * format-hlsl owns source parsing, selected-permutation resolution, and the
 * binding manifest. This adapter adds only a validated transient byte index.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect bytes.
 * @param {object} [options] Source and permutation options.
 * @returns {object} Resolved raw effect, selection, reflection, and transient stage bytes.
 */
function readEffectAnalysis(input, options = {}) {
  const resolved = readEffectAnalysis$1(input, options);
  return {
    ...resolved,
    stageBytecodeByKey: collectStageBytecodeByKey(resolved.effectDescription)
  };
}

export { normalizeBytecodeBytes, readEffectAnalysis };
//# sourceMappingURL=effectAnalysis.js.map
