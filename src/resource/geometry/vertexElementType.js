// The geometry payload's element types, decomposed into the facts a backend
// needs to name a vertex format.
//
// Source: runtime/src/resource/formats/cmf/core/constants.js (ElementType) and
// core/utils/vertex.js (readElementComponent), which is where the normalized
// divisors are decided.
//
// This lives in the geometry layer rather than beside the CMF reader because a
// backend must not import a format's internals to read a decl - the engine
// reading format chunks directly is a known layering defect and this does not
// add another. A geometry payload is CMF-shaped whichever reader produced it
// (a GR2 read asked for a declaration builds through the CMF builder), so these
// names are the geometry vocabulary, not one format's private spelling.
//
// NO BACKEND VOCABULARY APPEARS HERE. `Float16` is a fact; `float16x2` is
// WebGPU's name for a use of it, and WebGL2 spells the same use differently and
// with different restrictions. Each backend projects.
import { elementTypeSize } from "../formats/cmf/core/utils/vertex.js";


/**
 * How each element type is stored and interpreted.
 *
 * `base` is what the component IS in memory, before normalization: a
 * normalized type is an integer that a reader divides. `normalized` says the
 * shader sees it as a float in [0,1] or [-1,1] rather than as its integer
 * value, which is exactly the distinction both backends draw.
 */
const ELEMENT_TYPES = Object.freeze({
  Float32: { base: "float", normalized: false },
  Float16: { base: "float", normalized: false },
  UInt16Norm: { base: "uint", normalized: true },
  UInt16: { base: "uint", normalized: false },
  Int16Norm: { base: "sint", normalized: true },
  Int16: { base: "sint", normalized: false },
  UInt8Norm: { base: "uint", normalized: true },
  UInt8: { base: "uint", normalized: false },
  Int8Norm: { base: "sint", normalized: true },
  Int8: { base: "sint", normalized: false }
});


// Carbon's own element vocabulary: Tr2VertexDefinition::DataType
// (Tr2VertexDefinition.h:30-120), named "<U?><BASE>_<count>[_NORM]" with the
// component count inside the name. A Tr2VertexDefinition item carries these
// (the blitter's screen quad, sprite and spotlight pools), a geometry payload
// the names above. UFLOAT16/UFLOAT32 are still floats; the unsigned bit only
// means something to the integer bases.
const CARBON_DATA_TYPE = /^(U?)(BYTE|SHORT|INT32|FLOAT16|FLOAT32)_([1-4])(_NORM)?$/u;
const CARBON_BASE_BITS = Object.freeze({ BYTE: 8, SHORT: 16, INT32: 32, FLOAT16: 16, FLOAT32: 32 });


/**
 * Decomposes a Carbon DataType name, or returns null for any other name.
 *
 * @param {string} type Element type name.
 * @returns {{base: string, bits: number, count: number, normalized: boolean, bytes: number}|null}
 */
function CarbonDataType(type)
{
  const match = CARBON_DATA_TYPE.exec(String(type));

  if (!match) return null;

  const [ , unsigned, name, members, norm ] = match;
  const bits = CARBON_BASE_BITS[name];
  const count = Number(members);
  const base = name.startsWith("FLOAT") ? "float" : unsigned ? "uint" : "sint";

  return { base, bits, count, normalized: Boolean(norm), bytes: bits / 8 * count };
}


/**
 * Decomposes one declaration element into the facts a vertex format is built
 * from. Both vocabularies are accepted: a geometry payload's type plus
 * `elementCount`, or a Carbon DataType name that carries its own count.
 *
 * `bits` comes from the encoded byte width rather than from a second table, so
 * the two can never disagree.
 *
 * @param {object} element Declaration element carrying `type` and `elementCount`.
 * @returns {{base: string, bits: number, count: number, normalized: boolean, bytes: number}}
 * @throws {RangeError} When the type is not a geometry element type.
 */
export function VertexElementType(element)
{
  const type = element?.type;
  const carbon = CarbonDataType(type);

  if (carbon) return carbon;

  const described = ELEMENT_TYPES[type];

  if (!described)
  {
    throw new RangeError(`Unsupported vertex element type "${type}"`);
  }

  const bytes = elementTypeSize(type);
  const count = element?.elementCount ?? 0;

  if (!Number.isInteger(count) || count < 1 || count > 4)
  {
    throw new RangeError(`Vertex element "${type}" has an unusable element count ${count}`);
  }

  return { base: described.base, bits: bytes * 8, count, normalized: described.normalized, bytes: bytes * count };
}


/**
 * Whether a type name is one this layer can describe.
 *
 * `PackedTangent` and `PackedTangentLegacy` are usages rather than types, so
 * they do not appear here. Their component type still passes through this
 * table when the preserved packed channel is bound.
 *
 * @param {string} type Element type name.
 * @returns {boolean}
 */
export function IsVertexElementType(type)
{
  return Object.hasOwn(ELEMENT_TYPES, type) || CARBON_DATA_TYPE.test(String(type));
}
