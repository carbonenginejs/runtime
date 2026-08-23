/**
 * Fragment-stage control-flow uniformity analysis.
 *
 * WGSL forbids screen-space derivatives — the `dpdx*`/`dpdy*` family and the
 * implicit-LOD samples that derive internally (`textureSample`,
 * `textureSampleBias`) — inside NON-UNIFORM control flow (a branch whose
 * condition can differ between the pixels of a 2x2 quad). This module tags each
 * SSA value as "varying" (per-pixel) or uniform so the fragment lowerer can
 * identify those operations when an enclosing branch condition is varying and
 * emit the explicit derivative-uniformity diagnostic opt-out.
 *
 * Soundness note: constant-buffer and immediate operands are NOT represented as
 * SSA values (they are resolved at emit time), so the only varying SEEDS are
 * interpolated fragment inputs (`input[N]`, which includes `SV_Position`) and,
 * conservatively, all texture sampling/loading and derivative results. This
 * avoids known false negatives but can flag a result that happens to be
 * dynamically uniform; the only consequence is a broader diagnostic opt-out.
 */

const VARYING_PRODUCERS = new Set(["deriv_rtx", "deriv_rty", "deriv_rtx_coarse", "deriv_rty_coarse", "deriv_rtx_fine", "deriv_rty_fine", "sample", "sample_b", "sample_c", "sample_c_lz", "sample_d", "sample_l", "gather4", "ld", "ld_structured"]);

/**
 * Computes the set of value ids whose result can vary per pixel.
 *
 * @param {object} program Frozen CJS_SHADER_IR fragment program.
 * @returns {Set<string>} Ids of varying (non-uniform) values.
 */
function computeVaryingValues(program) {
  const varying = new Set();
  const instructions = program.instructions;
  for (const value of program.values) {
    if (value.origin === "program-input" && /^input\[/.test(value.register || "")) {
      varying.add(value.id);
      continue;
    }
    if (value.origin === "instruction-write" && VARYING_PRODUCERS.has(instructions[value.instructionIndex]?.opcodeName)) {
      varying.add(value.id);
    }
  }
  const inputsFor = value => {
    if (value.origin === "instruction-write") {
      const instruction = instructions[value.instructionIndex];
      return (instruction?.dataflow?.reads || []).flatMap(read => read.refs || []).map(ref => ref.valueId);
    }
    if (value.origin === "control-flow-merge") {
      return (value.incoming || []).map(entry => entry.valueId);
    }
    return [];
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const value of program.values) {
      if (varying.has(value.id)) continue;
      if (inputsFor(value).some(id => varying.has(id))) {
        varying.add(value.id);
        changed = true;
      }
    }
  }
  return varying;
}

/**
 * Reports whether a branch/switch instruction's scalar condition is uniform.
 *
 * @param {object} instruction DXBC control instruction (`if`/`switch`/`breakc`).
 * @param {Set<string>} varying Varying value ids from {@link computeVaryingValues}.
 * @returns {boolean} True when every value feeding the condition is uniform.
 */
function conditionIsUniform(instruction, varying) {
  const conditionRead = (instruction.dataflow?.reads || []).find(read => read.kind !== "index-read" && read.operandIndex === 0);
  if (!conditionRead) return true;
  return !(conditionRead.refs || []).some(ref => varying.has(ref.valueId));
}

export { computeVaryingValues, conditionIsUniform };
//# sourceMappingURL=uniformity.js.map
