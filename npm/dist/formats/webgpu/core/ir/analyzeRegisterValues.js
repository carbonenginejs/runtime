import { fixedSourceLanes } from './sourceLanes.js';
import { validateIndexableTempOperand } from './indexableTemps.js';
import { compareUtf8 } from '../../../../format/compareUtf8.js';

const COMPONENTS = ["x", "y", "z", "w"];
const REGISTER_FILES = new Set(["temp", "input", "output", "indexable_temp", "input_primitive_id", "output_depth", "output_coverage", "input_control_point", "output_control_point", "input_patch_constant", "input_domain_point", "output_control_point_id", "input_fork_instance_id", "input_join_instance_id", "input_thread_id", "input_thread_group_id", "input_thread_id_in_group", "input_coverage_mask", "input_thread_id_in_group_flattened", "input_gs_instance_id", "output_depth_greater_equal", "output_depth_less_equal"]);
const WRITABLE_FILES = new Set(["temp", "output", "indexable_temp", "output_depth", "output_coverage", "output_control_point", "output_depth_greater_equal", "output_depth_less_equal"]);
const NO_DESTINATION = new Set(["break", "breakc", "call", "callc", "case", "continue", "continuec", "cut", "default", "discard", "else", "emit", "emit_then_cut", "endif", "endloop", "endswitch", "if", "label", "loop", "nop", "ret", "retc", "switch", "sync", "store_uav_typed", "store_raw", "store_structured", "atomic_and", "atomic_or", "atomic_xor", "atomic_cmp_store", "atomic_iadd", "atomic_imax", "atomic_imin", "atomic_umax", "atomic_umin"]);
const DUAL_DESTINATION = new Set(["sincos", "imul", "umul", "udiv", "swapc"]);
const FULL_SOURCE_LANES = new Set(["ld", "ld_ms", "resinfo"]);
function operandComponents(operand, destination = false, activeComponents = null) {
  if (destination) {
    if (operand.mask) return COMPONENTS.filter(component => operand.mask.includes(component));
    if (operand.componentCount === 1) return ["x"];
    return COMPONENTS.slice();
  }
  if (operand.swizzle) {
    return activeComponents ? activeComponents.map(component => operand.swizzle[COMPONENTS.indexOf(component)]) : Array.from(operand.swizzle);
  }
  if (operand.selected) return activeComponents ? activeComponents.map(() => operand.selected) : [operand.selected];
  if (operand.mask) return COMPONENTS.filter(component => operand.mask.includes(component));
  if (operand.componentCount === 1) return ["x"];
  return activeComponents ? activeComponents.slice() : COMPONENTS.slice();
}
function registerKey(program, operand, role) {
  if (!REGISTER_FILES.has(operand.typeName)) return null;
  if (operand.typeName === "indexable_temp") {
    return validateIndexableTempOperand(program, operand, role)?.key || null;
  }
  const indices = (operand.indices || []).map(index => {
    const immediate = index.values?.join(":") || "";
    return index.relative ? `${immediate}+relative` : immediate;
  });
  return `${operand.typeName}[${indices.join(",")}]`;
}

/**
 * Classifies decoded instruction operands as register sources or destinations.
 *
 * @param {object} instruction Decoded instruction.
 * @returns {Array<{operand: object, role: string}>} Ordered operand roles.
 */
function operandRoles(instruction) {
  const operands = instruction.operands || [];
  if (NO_DESTINATION.has(instruction.opcodeName)) {
    return operands.map(operand => ({
      operand,
      role: "source"
    }));
  }
  if (DUAL_DESTINATION.has(instruction.opcodeName)) {
    return operands.map((operand, index) => ({
      operand,
      role: index < 2 ? "destination" : "source"
    }));
  }
  return operands.map((operand, index) => ({
    operand,
    role: index === 0 && WRITABLE_FILES.has(operand.typeName) ? "destination" : "source"
  }));
}
function valueRef(value, component) {
  return {
    valueId: value.id,
    component
  };
}
function ensureComponent(state, values, register, component, blockId) {
  let components = state.get(register);
  if (!components) {
    components = new Map();
    state.set(register, components);
  }
  if (!components.has(component)) {
    const value = {
      kind: "register-value",
      id: `value${values.length}`,
      origin: "block-input",
      blockId,
      instructionIndex: null,
      register,
      writeMask: component,
      previous: null
    };
    values.push(value);
    components.set(component, valueRef(value, component));
  }
  return components.get(component);
}
function analyzeBlock(program, block, values) {
  const state = new Map();
  const inputIds = new Set();
  for (const instructionIndex of block.instructionIndices) {
    const instruction = program.instructions[instructionIndex];
    const roles = operandRoles(instruction);
    const destinationComponents = Array.from(new Set(roles.filter(entry => entry.role === "destination" && entry.operand.typeName !== "null").flatMap(entry => operandComponents(entry.operand, true))));
    const activeSourceComponents = destinationComponents.length && !FULL_SOURCE_LANES.has(instruction.opcodeName) ? destinationComponents : null;
    const reads = [];
    const writes = [];
    for (let operandIndex = 0; operandIndex < roles.length; operandIndex += 1) {
      const {
        operand,
        role
      } = roles[operandIndex];
      if (role !== "source") continue;
      const register = registerKey(program, operand, "source");
      if (!register) continue;
      const components = operandComponents(operand, false, fixedSourceLanes(instruction, operandIndex, program) || activeSourceComponents);
      const refs = components.map(component => ensureComponent(state, values, register, component, block.id));
      for (const ref of refs) {
        const value = values.find(entry => entry.id === ref.valueId);
        if (value?.origin === "block-input") inputIds.add(value.id);
      }
      reads.push({
        kind: "register-read",
        operandIndex,
        register,
        components,
        refs
      });
    }
    for (let operandIndex = 0; operandIndex < roles.length; operandIndex += 1) {
      const {
        operand
      } = roles[operandIndex];
      const indices = operand.indices || [];
      for (let dimension = 0; dimension < indices.length; dimension += 1) {
        const relative = indices[dimension].relative;
        if (!relative) continue;
        const register = registerKey(program, relative, "source");
        if (!register) throw new Error("Shader IR relative index uses an unsupported register file");
        const components = operandComponents(relative, false);
        if (components.length !== 1) throw new Error("Shader IR relative index requires one scalar component");
        const refs = components.map(component => ensureComponent(state, values, register, component, block.id));
        for (const ref of refs) {
          const value = values.find(entry => entry.id === ref.valueId);
          if (value?.origin === "block-input") inputIds.add(value.id);
        }
        reads.push({
          kind: "index-read",
          operandIndex,
          dimension,
          register,
          components,
          refs
        });
      }
    }
    for (let operandIndex = 0; operandIndex < roles.length; operandIndex += 1) {
      const {
        operand,
        role
      } = roles[operandIndex];
      if (role !== "destination" || operand.typeName === "null") continue;
      const register = registerKey(program, operand, "destination");
      if (!register) continue;
      const mask = operandComponents(operand, true);
      const previous = {};
      for (const component of COMPONENTS) {
        if (!mask.includes(component)) {
          previous[component] = ensureComponent(state, values, register, component, block.id);
        }
      }
      const value = {
        kind: "register-value",
        id: `value${values.length}`,
        origin: "instruction-write",
        blockId: block.id,
        instructionIndex,
        register,
        writeMask: mask.join(""),
        previous: Object.keys(previous).length ? previous : null
      };
      values.push(value);
      let components = state.get(register);
      if (!components) {
        components = new Map();
        state.set(register, components);
      }
      for (const component of mask) components.set(component, valueRef(value, component));
      const result = {};
      for (const component of COMPONENTS) {
        result[component] = components.get(component) || ensureComponent(state, values, register, component, block.id);
      }
      writes.push({
        kind: "register-write",
        operandIndex,
        register,
        mask: mask.join(""),
        valueId: value.id,
        previous: value.previous,
        result
      });
    }
    instruction.dataflow = {
      reads,
      writes
    };
  }
  block.inputValueIds = Array.from(inputIds);
  block.outputValues = Array.from(state.entries()).flatMap(([register, components]) => Array.from(components.entries()).map(([component, ref]) => ({
    register,
    component,
    ref
  }))).sort((a, b) => compareUtf8(a.register, b.register) || compareUtf8(a.component, b.component));
}

/**
 * Adds block-local register versions, masked-write reconstruction records,
 * and deterministic block-exit state. A later pass resolves the conservative
 * block inputs through CFG predecessors.
 *
 * @param {object} program Mutable shader IR under construction.
 * @returns {object} The same program.
 */
function analyzeRegisterValues(program) {
  const values = [];
  for (const block of program.blocks) analyzeBlock(program, block, values);
  program.values = values;
  return program;
}

export { analyzeRegisterValues, operandRoles };
//# sourceMappingURL=analyzeRegisterValues.js.map
