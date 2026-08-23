import { WebgpuReadError } from '../errors.js';

/**
 * Structural validation for a loaded WebGPU effect container.
 *
 * This replaces `validateEffectPackageEnvelope`, which was 1762 lines. Most of
 * that is **deleted rather than translated**, and the reason matters: those
 * checks were not format invariants. The chunk container shattered one logical
 * tree into flat string-keyed arrays across `INFO`, `META`, `ANLS`, `WGSL`,
 * `PGRF` and `WGSB`, each holding a projection of the same effect, and roughly
 * 600 lines asserted that the projections still agreed with each other. A record
 * layout makes that question unaskable: containment replaces reference, position
 * replaces key, and the count word before an array replaces `Array.isArray`.
 *
 * What is deliberately **not** re-checked here, because phase 1 already enforces
 * it and checking twice means two places to keep correct:
 *
 * - count caps, arena containment, offset-table density and positional indexing,
 *   and the version range — `CjsCarbonEffectReader`;
 * - every sized record parsing to exactly its declared end — Rule 1, in the
 *   record codec and the block codec;
 * - duplicate stage type within a pass, and stage-type range — the shape adapter
 *   fails closed on both, which is where a runtime description is built.
 *
 * What remains is the one thing that is genuinely this layer's: the container
 * admits all six of Carbon's stage types by design, and WebGPU can express three.
 * That restriction belongs to the backend, not to the container — the Carbon
 * region is backend-invariant, and a container that admitted only three would not
 * be Carbon's container.
 */

/** Stage types WebGPU can express, by Carbon's `InputStageType` numbering. */
const WEBGPU_STAGE_TYPES = new Set([0, 1, 2]);

/**
 * Validates a loaded container for WebGPU consumption.
 *
 * @param {object} container Loaded `CarbonWebgpuContainer`.
 * @param {object} [options] Validation options.
 * @param {string} [options.source] Source label for diagnostics.
 * @throws {WebgpuReadError} When the container cannot serve WebGPU.
 */
function validateEffectContainer(container, options = {}) {
  const source = options.source || container.sourcePath || "memory";
  if (!container?.IsGood()) {
    throw new WebgpuReadError("Carbon WebGPU container is not readable", {
      source,
      cause: container?.readError ?? null
    });
  }
  if (!container.carbon.records.length) {
    throw new WebgpuReadError("Carbon WebGPU container declares no permutation bodies", {
      source
    });
  }

  // One check per distinct stored body. Aliased rows share a blob, so checking
  // per permutation would re-check identical bytes up to twenty times over on
  // the effects that alias hardest.
  const checked = new Set();
  for (let index = 0; index < container.carbon.records.length; index += 1) {
    const offset = container.carbon.records[index].offset;
    if (checked.has(offset)) continue;
    checked.add(offset);
    const description = container.GetDescription(index);
    for (const technique of description.techniques) {
      for (const [passIndex, pass] of technique.passes.entries()) {
        for (const stage of pass.stages) {
          // A stage carrying no program is reflection-only: the body
          // is known, the translation is not, and the emitter says so
          // with a zero-length payload. Those are legitimate — 107
          // shipped body-passes carry a geometry stage — so the rule
          // is about stages with a program, not about stages.
          if (stage.shaderData.size === 0) continue;
          if (!WEBGPU_STAGE_TYPES.has(stage.type)) {
            throw new WebgpuReadError(`Carbon WebGPU container carries a program for stage type ${stage.type}, ` + "which WebGPU cannot express", {
              source,
              permutationIndex: index,
              pass: `${technique.name.value}.pass${passIndex}`,
              stageType: stage.type
            });
          }
        }
      }
    }
  }
}

export { validateEffectContainer };
//# sourceMappingURL=validateContainer.js.map
