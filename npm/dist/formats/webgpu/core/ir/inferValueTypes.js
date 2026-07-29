const COMPONENTS = ["x", "y", "z", "w"];
const COMPONENT_INDEX = new Map(COMPONENTS.map((component, index) => [component, index]));
const SCALAR_TYPES = Object.freeze(["unknown", "float32", "int32", "uint32", "bool", "bitpattern32"]);
const FLOAT_OPS = new Set(["add", "deriv_rtx", "deriv_rty", "deriv_rtx_coarse", "deriv_rtx_fine", "deriv_rty_coarse", "deriv_rty_fine", "div", "dp2", "dp3", "dp4", "exp", "frc", "log", "mad", "max", "min", "mul", "rcp", "round_ne", "round_ni", "round_pi", "round_z", "rsq", "sqrt", "sincos"]);
const FLOAT_COMPARE = new Set(["eq", "ge", "lt", "ne"]);
const INT_OPS = new Set(["iadd", "imad", "imax", "imin", "imul", "ineg", "ishl", "ishr"]);
const INT_COMPARE = new Set(["ieq", "ige", "ilt", "ine"]);
const UINT_OPS = new Set(["countbits", "firstbit_hi", "firstbit_lo", "firstbit_shi", "uaddc", "ubfe", "udiv", "umad", "umax", "umin", "umul", "ushr", "usubb"]);
const UINT_COMPARE = new Set(["uge", "ult"]);
const BITWISE_OPS = new Set(["and", "not", "or", "xor"]);
const CONTROL_MASK_OPS = new Set(["breakc", "continuec", "discard", "if", "retc", "switch"]);
const SAMPLE_OPS = new Set(["sample", "sample_b", "sample_c", "sample_c_lz", "sample_d", "sample_l"]);
function bindingResultType(program, instruction, operandTypeName, resourceKind) {
  const resource = instruction.operands.find(operand => operand.typeName === operandTypeName);
  const reference = resource?.resourceReference;
  const binding = program.bindings.find(entry => entry.resourceKind === resourceKind && (reference?.rangeId !== null && reference?.rangeId !== undefined ? entry.range.rangeId === reference.rangeId : entry.registerIndex === resource?.registerIndex));
  const mapped = (binding?.returnType?.returnTypeNames || []).map(type => ({
    unorm: "float32",
    snorm: "float32",
    float: "float32",
    sint: "int32",
    uint: "uint32"
  })[type] || "unknown");
  const concrete = mapped.filter(type => type !== "unknown");
  if (!concrete.length) return null;
  return new Set(concrete).size === 1 ? concrete[0] : "bitpattern32";
}
function sampleResultType(program, instruction) {
  return bindingResultType(program, instruction, "resource", "sampled-resource");
}
function ruleFor(opcodeName, program, instruction) {
  if (FLOAT_OPS.has(opcodeName)) return {
    name: "float-arithmetic",
    destination: "float32",
    sources: "float32"
  };
  if (FLOAT_COMPARE.has(opcodeName)) return {
    name: "float-comparison-mask",
    destination: "uint32",
    sources: "float32"
  };
  if (INT_OPS.has(opcodeName)) return {
    name: "signed-integer",
    destination: "int32",
    sources: "int32"
  };
  if (INT_COMPARE.has(opcodeName)) return {
    name: "signed-comparison-mask",
    destination: "uint32",
    sources: "int32"
  };
  if (UINT_OPS.has(opcodeName)) return {
    name: "unsigned-integer",
    destination: "uint32",
    sources: "uint32"
  };
  if (UINT_COMPARE.has(opcodeName)) return {
    name: "unsigned-comparison-mask",
    destination: "uint32",
    sources: "uint32"
  };
  if (BITWISE_OPS.has(opcodeName)) return {
    name: "bitwise",
    destination: "uint32",
    sources: "uint32"
  };
  if (CONTROL_MASK_OPS.has(opcodeName)) return {
    name: "control-mask",
    destination: null,
    sourceByOperand: {
      0: "uint32"
    },
    conditionProjection: "nonzero"
  };
  if (SAMPLE_OPS.has(opcodeName)) {
    const sourceByOperand = {
      1: "float32"
    };
    if (["sample_b", "sample_c", "sample_l"].includes(opcodeName)) sourceByOperand[4] = "float32";
    if (opcodeName === "sample_d") Object.assign(sourceByOperand, {
      4: "float32",
      5: "float32"
    });
    return {
      name: "sample-resource",
      destination: sampleResultType(program, instruction),
      sourceByOperand
    };
  }
  if (opcodeName === "resinfo") {
    return {
      name: "resource-info",
      destination: instruction?.resinfoReturnTypeName === "uint" ? "uint32" : "float32"
    };
  }
  if (opcodeName === "f16tof32") return {
    name: "half-unpack",
    destination: "float32",
    sourceByOperand: {
      1: "uint32"
    }
  };
  if (opcodeName === "f32tof16") return {
    name: "half-pack",
    destination: "uint32",
    sourceByOperand: {
      1: "float32"
    }
  };
  if (opcodeName === "ld") {
    return {
      name: "texture-load",
      destination: sampleResultType(program, instruction),
      sourceByOperand: {
        1: "uint32"
      }
    };
  }
  if (opcodeName === "atomic_iadd") {
    return {
      name: "atomic-add",
      destination: null,
      sourceByOperand: {
        1: "uint32",
        2: "uint32"
      }
    };
  }
  if (opcodeName === "store_uav_typed") {
    return {
      name: "typed-uav-store",
      destination: null,
      sourceByOperand: {
        1: "uint32",
        2: bindingResultType(program, instruction, "uav", "storage-resource")
      }
    };
  }
  if (opcodeName === "ld_structured") {
    return {
      name: "structured-load",
      destination: null,
      sourceByOperand: {
        1: "uint32",
        2: "uint32"
      }
    };
  }
  if (opcodeName === "store_structured") {
    return {
      name: "structured-store",
      destination: null,
      sourceByOperand: {
        1: "uint32",
        2: "uint32"
      }
    };
  }
  const conversions = {
    ftoi: ["int32", "float32"],
    ftou: ["uint32", "float32"],
    itof: ["float32", "int32"],
    utof: ["float32", "uint32"]
  };
  if (conversions[opcodeName]) {
    const [destination, source] = conversions[opcodeName];
    return {
      name: "numeric-conversion",
      destination,
      sourceByOperand: {
        1: source
      },
      conversion: {
        from: source,
        to: destination
      }
    };
  }
  if (opcodeName === "mov") return {
    name: "move",
    destination: null,
    equalitySources: [1]
  };
  if (opcodeName === "movc") return {
    name: "conditional-move",
    destination: null,
    sourceByOperand: {
      1: "uint32"
    },
    equalitySources: [2, 3]
  };
  return {
    name: "untyped",
    destination: null
  };
}
function nodeKey(ref) {
  return `${ref.valueId}.${ref.component}`;
}
function valueComponents(value) {
  return Array.from(value.writeMask || "");
}
function signatureType(program, register, component) {
  if (["output_depth", "output_depth_greater_equal", "output_depth_less_equal"].includes(register)) return "float32";
  const match = /^(input|output)\[(\d+)/.exec(register);
  if (!match) return null;
  const elements = program.signatures?.[match[1]] || [];
  const componentBit = 1 << COMPONENT_INDEX.get(component);
  const element = elements.find(entry => entry.registerIndex === Number(match[2]) && entry.mask & componentBit);
  return element && SCALAR_TYPES.includes(element.componentTypeName) ? element.componentTypeName : null;
}
function correspondingRef(refs, index) {
  if (!refs.length) return null;
  return refs.length === 1 ? refs[0] : refs[index % refs.length];
}

/**
 * Infers component storage types from opcode domains, signatures, moves, and
 * SSA merges. Conflicting typeless-register uses become `bitpattern32` and
 * receive explicit per-use reinterpret records.
 *
 * @param {object} program Mutable shader IR under construction.
 * @returns {object} The same program.
 */
function inferValueTypes(program) {
  const parent = new Map();
  const constraints = new Map();
  const ensure = ref => {
    const key = nodeKey(ref);
    if (!parent.has(key)) {
      parent.set(key, key);
      constraints.set(key, new Set());
    }
    return key;
  };
  const find = key => {
    let current = key;
    while (parent.get(current) !== current) current = parent.get(current);
    while (parent.get(key) !== key) {
      const next = parent.get(key);
      parent.set(key, current);
      key = next;
    }
    return current;
  };
  const union = (leftRef, rightRef) => {
    const left = find(ensure(leftRef));
    const right = find(ensure(rightRef));
    if (left === right) return;
    const [root, child] = left.localeCompare(right) <= 0 ? [left, right] : [right, left];
    parent.set(child, root);
    for (const type of constraints.get(child)) constraints.get(root).add(type);
  };
  const constrain = (ref, type) => {
    if (!type) return;
    constraints.get(find(ensure(ref))).add(type);
  };
  for (const value of program.values) {
    for (const component of valueComponents(value)) ensure({
      valueId: value.id,
      component
    });
    if (value.origin === "control-flow-merge") {
      const mergeRef = {
        valueId: value.id,
        component: value.writeMask
      };
      for (const incoming of value.incoming) union(mergeRef, incoming);
    }
  }
  for (const instruction of program.instructions) {
    const rule = ruleFor(instruction.opcodeName, program, instruction);
    const writes = instruction.dataflow.writes;
    for (const sourceOperandIndex of rule.equalitySources || []) {
      const read = instruction.dataflow.reads.find(entry => entry.operandIndex === sourceOperandIndex && entry.kind !== "index-read");
      if (!read) continue;
      for (const write of writes) {
        Array.from(write.mask).forEach((component, index) => {
          const sourceRef = correspondingRef(read.refs, index);
          if (sourceRef) union({
            valueId: write.valueId,
            component
          }, sourceRef);
        });
      }
    }
  }
  for (const value of program.values) {
    for (const component of valueComponents(value)) {
      const type = signatureType(program, value.register, component);
      if (type) constrain({
        valueId: value.id,
        component
      }, type);
    }
  }
  for (const instruction of program.instructions) {
    const rule = ruleFor(instruction.opcodeName, program, instruction);
    if (rule.destination) {
      for (const write of instruction.dataflow.writes) {
        for (const component of write.mask) constrain({
          valueId: write.valueId,
          component
        }, rule.destination);
      }
    }
    for (const read of instruction.dataflow.reads) {
      if (read.kind === "index-read") continue;
      const expected = rule.sourceByOperand?.[read.operandIndex] ?? rule.sources ?? null;
      for (const ref of read.refs) constrain(ref, expected);
    }
  }

  // A live value (read by an instruction or feeding a phi) whose type is
  // otherwise unconstrained — e.g. an immediate `0` that only ever flows
  // through moves and never reaches a typed use — defaults to raw bitpattern32
  // bits so it can be emitted. This covers EVERY lane of a live value, not
  // just the read lane: an emitted multi-lane value needs a type for its dead
  // lanes too (the vector constructor references all of them). Because moves
  // union source and destination, the default propagates consistently across
  // the whole move chain and any phi it feeds. Genuinely dead writes are never
  // read, keep no constraint (stay `unknown`), and are dropped by the lowerers.
  const liveValueIds = new Set();
  for (const instruction of program.instructions) {
    for (const read of instruction.dataflow.reads) {
      if (read.kind === "index-read") continue;
      for (const ref of read.refs) liveValueIds.add(ref.valueId);
    }
  }
  for (const value of program.values) {
    for (const incoming of value.incoming || []) liveValueIds.add(incoming.valueId);
  }
  for (const value of program.values) {
    if (!liveValueIds.has(value.id)) continue;
    for (const component of valueComponents(value)) {
      const ref = {
        valueId: value.id,
        component
      };
      if (!constraints.get(find(ensure(ref))).size) constrain(ref, "bitpattern32");
    }
  }
  const typeForRef = ref => {
    const types = Array.from(constraints.get(find(ensure(ref))));
    if (types.length === 0) return "unknown";
    return types.length === 1 ? types[0] : "bitpattern32";
  };
  for (const value of program.values) {
    value.componentTypes = {};
    for (const component of valueComponents(value)) {
      value.componentTypes[component] = typeForRef({
        valueId: value.id,
        component
      });
    }
  }
  for (const instruction of program.instructions) {
    const rule = ruleFor(instruction.opcodeName, program, instruction);
    const writes = instruction.dataflow.writes;
    const destinationTypes = writes.flatMap(write => Array.from(write.mask).map(component => program.values.find(value => value.id === write.valueId)?.componentTypes[component])).filter(Boolean);
    const moveType = destinationTypes.length && new Set(destinationTypes).size === 1 ? destinationTypes[0] : null;
    const operandTypes = instruction.operands.map((operand, operandIndex) => {
      let expectedType = rule.sourceByOperand?.[operandIndex] ?? null;
      if (!expectedType && rule.sources && operandIndex > 0) expectedType = rule.sources;
      if (!expectedType && (rule.equalitySources || []).includes(operandIndex)) expectedType = moveType;
      if (instruction.dataflow.writes.some(write => write.operandIndex === operandIndex)) expectedType = rule.destination ?? moveType;
      return {
        operandIndex,
        role: instruction.dataflow.writes.some(write => write.operandIndex === operandIndex) ? "destination" : "source",
        expectedType: expectedType || "unknown",
        modifier: operand.modifierName || "none",
        minPrecision: operand.minPrecisionName || "default",
        immediate: operand.typeName === "immediate32" ? operand.immediateValues.map((value, component) => ({
          component: COMPONENTS[component],
          uint32: value.uint32,
          float32: value.float32
        })) : null
      };
    });
    const bitcasts = [];
    for (const read of instruction.dataflow.reads) {
      if (read.kind === "index-read") continue;
      let expected = rule.sourceByOperand?.[read.operandIndex] ?? rule.sources ?? null;
      if (!expected && (rule.equalitySources || []).includes(read.operandIndex)) expected = moveType;
      if (!expected || expected === "unknown") continue;
      read.refs.forEach((ref, componentIndex) => {
        const storage = typeForRef(ref);
        if (storage !== expected && storage !== "unknown") {
          bitcasts.push({
            kind: "read-bitcast",
            operandIndex: read.operandIndex,
            componentIndex,
            valueId: ref.valueId,
            component: ref.component,
            from: storage,
            to: expected
          });
        }
      });
    }
    for (const write of writes) {
      if (!rule.destination) continue;
      Array.from(write.mask).forEach(component => {
        const storage = typeForRef({
          valueId: write.valueId,
          component
        });
        if (storage !== rule.destination && storage !== "unknown") {
          bitcasts.push({
            kind: "result-bitcast",
            operandIndex: write.operandIndex,
            valueId: write.valueId,
            component,
            from: rule.destination,
            to: storage
          });
        }
      });
    }
    for (const operand of operandTypes) {
      if (!operand.immediate || !["float32", "int32"].includes(operand.expectedType)) continue;
      for (const immediate of operand.immediate) {
        bitcasts.push({
          kind: "immediate-bitcast",
          operandIndex: operand.operandIndex,
          component: immediate.component,
          from: "uint32",
          to: operand.expectedType,
          uint32: immediate.uint32
        });
      }
    }
    instruction.typeInfo = {
      kind: "instruction-types",
      rule: rule.name,
      resultType: rule.destination ?? moveType ?? "unknown",
      conversion: rule.conversion || null,
      conditionProjection: rule.conditionProjection || null,
      operandTypes,
      bitcasts
    };
  }
  program.typeSystem = {
    kind: "scalar-type-system",
    scalarTypes: SCALAR_TYPES.slice(),
    comparisonResult: "uint32-mask",
    conditionProjection: "nonzero",
    registerStorage: "component-granular"
  };
  return program;
}

export { SCALAR_TYPES, inferValueTypes };
//# sourceMappingURL=inferValueTypes.js.map
