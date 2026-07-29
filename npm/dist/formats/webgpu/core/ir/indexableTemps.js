const COMPONENTS = "xyzw";
const DESTINATION_MASK = /^x?y?z?w?$/u;
function fail(reason) {
  throw new Error(`Shader IR indexable temp is not supported: ${reason}`);
}
function validateComponents(operand, role, componentCount) {
  const valid = COMPONENTS.slice(0, componentCount);
  if (role === "destination") {
    if (typeof operand.mask !== "string" || !operand.mask || !DESTINATION_MASK.test(operand.mask) || Array.from(operand.mask).some(component => !valid.includes(component)) || operand.swizzle || operand.selected) {
      fail("a destination requires one canonical in-range write mask");
    }
    return;
  }
  if (operand.mask) {
    fail("a source indexable temp requires swizzle or select component mode");
  }
  if ([operand.swizzle, operand.selected].filter(Boolean).length > 1) {
    fail("a source requires exactly one component-selection mode");
  }
  if (operand.swizzle && (operand.swizzle.length !== 4 || Array.from(operand.swizzle).some(component => !valid.includes(component))) || operand.selected && (operand.selected.length !== 1 || !valid.includes(operand.selected))) {
    fail("a source selects an invalid or out-of-range component");
  }
}

/**
 * Validates the declaration-backed identity of an indexable-temp operand.
 * Mutable fixed slots are returned as ordinary SSA register identities.
 * Reads from an extracted immutable table return null so they bypass register
 * SSA and lower through the table expression path instead.
 *
 * @param {object} program Shader IR program under construction or lowering.
 * @param {object} operand Indexable-temp operand.
 * @param {"source"|"destination"} role Operand role.
 * @returns {{registerIndex:number, slotIndex:number, key:string}|null} Fixed SSA address, or null for a const-table read.
 */
function validateIndexableTempOperand(program, operand, role) {
  if (operand?.typeName !== "indexable_temp") return null;
  if (!["source", "destination"].includes(role)) throw new TypeError("Invalid indexable-temp operand role");
  const indices = operand.indices;
  if (!Array.isArray(indices) || indices.length !== 2) {
    fail("an operand requires exactly [register][slot] indices");
  }
  const registerIndex = indices[0];
  if (registerIndex?.relative || !Array.isArray(registerIndex?.values) || registerIndex.values.length !== 1 || !Number.isInteger(registerIndex.values[0]) || registerIndex.values[0] < 0) {
    fail("the register index must be one fixed non-negative integer");
  }
  const register = registerIndex.values[0];
  if (!Number.isInteger(operand.registerIndex) || operand.registerIndex !== register) {
    fail("the operand register identity does not match its first index");
  }
  const declarations = (program.declarations || []).filter(declaration => declaration.opcodeName === "dcl_indexable_temp" && declaration.data?.registerIndex === register);
  if (declarations.length !== 1) {
    fail(declarations.length ? `x${register} has duplicate declarations` : `x${register} is undeclared`);
  }
  const declaration = declarations[0].data;
  if (!Number.isInteger(declaration.registerCount) || declaration.registerCount < 1) {
    fail(`x${register} has no usable slot count`);
  }
  if (!Number.isInteger(declaration.componentCount) || declaration.componentCount < 1 || declaration.componentCount > 4) {
    fail(`x${register} has an invalid component count`);
  }
  if (operand.componentCount !== 4) {
    fail(`x${register} operand is not four-component`);
  }
  validateComponents(operand, role, declaration.componentCount);
  const tables = (program.constTables || []).filter(table => table.registerIndex === register);
  if (tables.length > 1) fail(`x${register} aliases duplicate immutable constant tables`);
  if (tables.length && role === "destination") fail(`x${register} aliases an immutable constant table`);
  const slotIndex = indices[1];
  if (slotIndex?.relative) {
    if (!Array.isArray(slotIndex.values) || slotIndex.values.length > 1 || slotIndex.values.length === 1 && (!Number.isInteger(slotIndex.values[0]) || slotIndex.values[0] < 0)) {
      fail(`x${register} has an invalid relative slot base`);
    }
    if (tables.length && role === "source") return null;
    fail(`x${register} uses relative ${role} addressing`);
  }
  if (!Array.isArray(slotIndex?.values) || slotIndex.values.length !== 1 || !Number.isInteger(slotIndex.values[0]) || slotIndex.values[0] < 0) {
    fail(`x${register} requires one fixed non-negative slot index`);
  }
  const slot = slotIndex.values[0];
  if (slot >= declaration.registerCount) {
    fail(`x${register}[${slot}] is outside its declared range`);
  }
  if (tables.length) return null;
  if (declaration.componentCount !== 4) {
    fail(`x${register}[${slot}] is not a four-component mutable operand`);
  }
  return {
    registerIndex: register,
    slotIndex: slot,
    key: `indexable_temp[${register},${slot}]`
  };
}

/**
 * Cross-checks a fixed source operand against its canonical SSA read record.
 *
 * @param {object} program Frozen shader IR program.
 * @param {object} operand Indexable-temp source operand.
 * @param {object} read Register-read or index-read dataflow record.
 * @param {string[]} expectedComponents Components selected by the current operand metadata.
 * @returns {{registerIndex:number, slotIndex:number,key:string}} Validated fixed address.
 */
function validateIndexableTempRead(program, operand, read, expectedComponents) {
  if (operand?.typeName !== "indexable_temp") return null;
  const address = validateIndexableTempOperand(program, operand, "source");
  if (!address || read?.register !== address.key || !Array.isArray(read.refs) || !read.refs.length || !Array.isArray(expectedComponents) || expectedComponents.length !== read.refs.length || read.refs.some((ref, index) => ref.component !== expectedComponents[index]) || Array.isArray(read.components) && (read.components.length !== expectedComponents.length || read.components.some((component, index) => component !== expectedComponents[index]))) {
    fail("a fixed source has inconsistent register dataflow");
  }
  for (const ref of read.refs) {
    const value = program.values.find(entry => entry.id === ref.valueId);
    if (!value || value.register !== address.key) {
      fail("a fixed source references a value from another register");
    }
  }
  return address;
}

/**
 * Cross-checks a fixed destination operand against its canonical SSA write.
 *
 * @param {object} program Frozen shader IR program.
 * @param {object} operand Indexable-temp destination operand.
 * @param {object} write Register-write dataflow record.
 * @returns {{registerIndex:number, slotIndex:number,key:string}} Validated fixed address.
 */
function validateIndexableTempWrite(program, operand, write) {
  const address = validateIndexableTempOperand(program, operand, "destination");
  const value = program.values.find(entry => entry.id === write?.valueId);
  if (!address || write?.register !== address.key || write.mask !== operand.mask || !value || value.register !== address.key || value.writeMask !== write.mask) {
    fail("a fixed destination has inconsistent indexable-temp dataflow");
  }
  return address;
}

export { validateIndexableTempOperand, validateIndexableTempRead, validateIndexableTempWrite };
//# sourceMappingURL=indexableTemps.js.map
