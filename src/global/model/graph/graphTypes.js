// VARTYPE lives with Blue's other shared enums (global/consts/blue.js); re-exported here for the graph's importers.
export { VARTYPE } from "../../consts/blue.js";
import { VARTYPE } from "../../consts/blue.js";

/**
 * Tests that a string can be a path: empty, or text with no control characters.
 * @cjs Authored files hold paths with no scheme, backslashes, spaces and drive letters, so the
 * shape is not enforced. What a path may name is `accepts`, which only tools read.
 */
function isPathLike(value)
{
  for (let i = 0; i < value.length; i++)
  {
    if (value.charCodeAt(i) < 32) return false;
  }

  return true;
}

const scalar = (storage, handler, fields) => ({ storage, handler, ...fields });
const integer = (storage, bits, signed) => ({ storage, handler: "long", direct: true, bits, signed });
const floats = length => ({ storage: VARTYPE.FLOATARRAY, handler: "floatArray", length });
const doubles = length => ({ storage: VARTYPE.DOUBLEARRAY, handler: "doubleArray", length });
const integers = (storage, ctor, bits, signed, length = 0) => ({ storage, handler: "intArray", length, ctor, bits, signed });

/**
 * Every type name, as data: its storage kind, its handler, and what differs from others of that
 * kind. These are the `@type.*` names. A new name exists only if it changes a default, a widget
 * or a meaning.
 * @cjs Modelled on: BLUE_DEFINE_TYPE_TRAIT (blueexposure/include/BlueTypeTraits.h:64-74,432).
 */
export const GRAPH_TYPES = {
  invalid: scalar(VARTYPE.INVALID, "invalid"),
  float32: scalar(VARTYPE.FLOAT, "float", { direct: false }),
  float64: scalar(VARTYPE.DOUBLE, "double", { direct: false }),
  boolean: scalar(VARTYPE.BOOL, "bool", { direct: true }),
  int8: integer(VARTYPE.BYTE, 8, true),
  uint8: integer(VARTYPE.BYTE, 8, false),
  int16: integer(VARTYPE.SHORT, 16, true),
  uint16: integer(VARTYPE.SHORT, 16, false),
  int32: integer(VARTYPE.LONG, 32, true),
  uint32: integer(VARTYPE.ULONG, 32, false),
  int64: { storage: VARTYPE.INT64, handler: "int64", bits: 64, signed: true },
  uint64: { storage: VARTYPE.UINT64, handler: "int64", bits: 64, signed: false },
  string: scalar(VARTYPE.STDSTRING, "string", { direct: true }),
  wstring: scalar(VARTYPE.STDWSTRING, "string", { direct: true }),
  path: scalar(VARTYPE.STDSTRING, "string", { direct: true, check: isPathLike }),
  wpath: scalar(VARTYPE.STDWSTRING, "string", { direct: true, check: isPathLike }),
  expression: scalar(VARTYPE.STDSTRING, "string", { direct: true }),
  cstring: scalar(VARTYPE.CSTRING, "cstring"),
  wcstring: scalar(VARTYPE.WCSTRING, "cstring"),
  reference: scalar(VARTYPE.REFERENCE, "cstring"),
  wreference: scalar(VARTYPE.WREFERENCE, "cstring"),
  sharedString: scalar(VARTYPE.SHAREDSTRING, "cstring"),
  sharedStringW: scalar(VARTYPE.SHAREDSTRINGW, "cstring"),
  pyObject: scalar(VARTYPE.PYOBJECTPTR, "pyObject"),
  scriptCallback: scalar(VARTYPE.SCRIPTCALLBACK, "pyObject"),
  vec2: floats(2),
  vec3: floats(3),
  vec4: floats(4),
  quat: floats(4),
  color: floats(4),
  mat3: floats(9),
  mat4: floats(16),
  float32Array: floats(0),
  vec2d: doubles(2),
  vec3d: doubles(3),
  vec4d: doubles(4),
  float64Array: doubles(0),
  vec3i: integers(VARTYPE.INTARRAY, Int32Array, 32, true, 3),
  int8Array: integers(VARTYPE.INT8ARRAY, Int8Array, 8, true),
  uint8Array: integers(VARTYPE.UINT8ARRAY, Uint8Array, 8, false),
  uint8ClampedArray: integers(VARTYPE.UINT8CLAMPEDARRAY, Uint8ClampedArray, 8, false),
  int16Array: integers(VARTYPE.INT16ARRAY, Int16Array, 16, true),
  uint16Array: integers(VARTYPE.UINT16ARRAY, Uint16Array, 16, false),
  int32Array: integers(VARTYPE.INTARRAY, Int32Array, 32, true),
  uint32Array: integers(VARTYPE.UINT32ARRAY, Uint32Array, 32, false),
  rootRef: scalar(VARTYPE.IROOTPTR, "object"),
  rootWeak: scalar(VARTYPE.IROOTWEAKREF, "object"),
  root: scalar(VARTYPE.IROOT, "iroot"),
  rawStruct: scalar(VARTYPE.IROOT, "iroot"),
  list: scalar(VARTYPE.IROOT, "list"),
  structList: scalar(VARTYPE.IROOT, "list"),
  map: scalar(VARTYPE.IROOT, "map"),
  values: scalar(VARTYPE.IROOT, "values"),
  valuesMap: scalar(VARTYPE.IROOT, "valuesMap")
};

/** The bag key that holds an object's metadata, as Carbon's readers name it (DictReader.cpp:185). */
export const GRAPH_METADATA_KEY = "__bluemetadata__";

/**
 * The embedded classes a math member is wrapped in on the wire: persisted element names in
 * order, and their defaults. A member names one in its `wrapped`.
 * @cjs Modelled on: TriMatrix, TriVector, TriQuaternion and TriColor's persisted members.
 */
export const GRAPH_WRAPPERS = {
  TriMatrix: {
    wireClass: "TriMatrix",
    elements: [ "_11", "_12", "_13", "_14", "_21", "_22", "_23", "_24", "_31", "_32", "_33", "_34", "_41", "_42", "_43", "_44" ],
    defaults: [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]
  },
  TriVector: { wireClass: "TriVector", elements: [ "x", "y", "z" ], defaults: [ 0, 0, 0 ] },
  TriQuaternion: { wireClass: "TriQuaternion", elements: [ "x", "y", "z", "w" ], defaults: [ 0, 0, 0, 1 ] },
  TriColor: { wireClass: "TriColor", elements: [ "r", "g", "b", "a" ], defaults: [ 0, 0, 0, 0 ] }
};

/**
 * A compiled member's own bits, above Be::EDMASK, in the integer that holds its Be::EDITFLAGS.
 * BINARY is a block its class reads and writes itself, and RUNTIMEONLY claims a name and is never read.
 * @cjs Carbon's binary block is a VARTYPE on a PERSISTONLY row, and it has no runtime-only member.
 */
export const GraphMemberFlags = Object.freeze({
  BINARY: 0x1000,
  RUNTIMEONLY: 0x2000
});

/**
 * The operations the graph runs.
 * @cjs Our graph operations; Carbon has no single equivalent.
 */
export const GraphOperation = Object.freeze({
  GET: 0,
  SET: 1,
  CREATE: 2,
  COPY: 3,
  CLONE: 4,
  DELETE: 5
});
