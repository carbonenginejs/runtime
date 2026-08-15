import { SchemaBoundError } from "./schemaBoundErrors.js";

const TEXT = new TextDecoder("utf-8");

/**
 * Decodes one value of any schema type, and reports how many bytes it spanned.
 *
 * Every type answers both questions through this one function because the
 * container mixes them: a list's items may be fixed, in which case the schema
 * states the stride, or variable, in which case the only way to find item `n+1`
 * is to have finished reading item `n`.
 *
 * @param {object} context Reader context: `view`, `bytes` and `options`.
 * @param {number} offset Absolute byte offset of the value.
 * @param {object} node The schema node describing the value.
 * @returns {{value: *, size: number}} Decoded value and the bytes it occupied.
 */
export function ReadValue(context, offset, node) {
  switch (node.type) {
    case "int": return ReadInt(context, offset, node);
    // Identifier types. Each is a four-byte unsigned integer that names a row in
    // another table, and the schema states the meaning rather than the width -
    // `factionID` and one or two others declare no size at all. Keeping them
    // named here rather than folding them into `int` is what lets a consumer see
    // that a number is a key.
    case "localizationID": case "typeID": case "factionID": case "groupID":
    case "categoryID": case "graphicID": case "iconID": case "fsdReference":
      return ReadInt(context, offset, { size: node.size ?? 4, min: 0 });
    case "float": return ReadFloat(context, offset, node);
    case "bool": return { value: context.view.getUint8(offset) !== 0, size: node.size ?? 1 };
    case "enum": return ReadEnum(context, offset, node);
    case "vector2": return ReadVector(context, offset, node, 2);
    case "vector3": return ReadVector(context, offset, node, 3);
    // `unicode` is the same framing as `string`; the distinction is Python's,
    // and both arrive as a byte length followed by UTF-8.
    case "string": case "resPath": case "unicode": return ReadString(context, offset);
    case "list": return ReadList(context, offset, node);
    case "dict": return ReadDict(context, offset, node);
    case "object": return ReadObject(context, offset, node);
    default:
      throw SchemaBoundError(`The schema declares a type this reader does not know: ${node.type}.`, {
        schemaType: node.type
      });
  }
}

/** Reads a 1, 2, 4 or 8 byte integer, signed only when the schema allows it. */
function ReadInt(context, offset, node) {
  const size = node.size ?? 4;
  // `min: 0` is the schema's own statement that the field cannot go negative,
  // and it is the only signedness information there is.
  const unsigned = typeof node.min === "number" && node.min >= 0;
  const view = context.view;

  switch (size) {
    case 1: return { value: unsigned ? view.getUint8(offset) : view.getInt8(offset), size };
    case 2: return { value: unsigned ? view.getUint16(offset, true) : view.getInt16(offset, true), size };
    case 4: return { value: unsigned ? view.getUint32(offset, true) : view.getInt32(offset, true), size };
    case 8: return { value: Narrow(unsigned ? view.getBigUint64(offset, true) : view.getBigInt64(offset, true)), size };
    default:
      throw SchemaBoundError(`An integer of ${size} bytes is not a width this container uses.`);
  }
}

/** Returns a wide integer as a Number when that is lossless, else a BigInt. */
function Narrow(value) {
  return value >= -9007199254740991n && value <= 9007199254740991n ? Number(value) : value;
}

/** Reads a single or double precision float. */
function ReadFloat(context, offset, node) {
  const size = node.size ?? 4;

  if (size === 8) return { value: context.view.getFloat64(offset, true), size };
  if (size === 4) return { value: context.view.getFloat32(offset, true), size };

  throw SchemaBoundError(`A float of ${size} bytes is not a width this container uses.`);
}

/**
 * Reads an enumeration, as its number or its name.
 *
 * `readEnumValue` is the schema saying the stored number is the meaning; without
 * it the name is. A number with no name is returned as the number rather than
 * dropped, because an unnamed member is data the client still stored.
 */
function ReadEnum(context, offset, node) {
  const { value, size } = ReadInt(context, offset, { size: node.size ?? 1, min: 0 });

  if (node.readEnumValue === true || !node.values) return { value, size };

  for (const [ name, member ] of Object.entries(node.values)) {
    if (member === value) return { value: name, size };
  }

  return { value, size };
}

/** Reads a fixed-length vector into the component names the schema aliases. */
function ReadVector(context, offset, node, components) {
  const wide = (node.precision ?? "double") === "double";
  const width = wide ? 8 : 4;
  const read = index => wide
    ? context.view.getFloat64(offset + index * width, true)
    : context.view.getFloat32(offset + index * width, true);
  const aliases = node.aliases ?? DEFAULT_COMPONENTS[components];
  const value = {};

  for (const [ name, index ] of Object.entries(aliases)) value[name] = read(index);

  return { value, size: node.size ?? width * components };
}

const DEFAULT_COMPONENTS = { 2: { x: 0, y: 1 }, 3: { x: 0, y: 1, z: 2 } };

/** Reads a length-prefixed UTF-8 string; `resPath` is the same shape. */
function ReadString(context, offset) {
  const length = context.view.getUint32(offset, true);
  const start = offset + 4;

  return {
    value: TEXT.decode(context.bytes.subarray(start, start + length)),
    size: 4 + length
  };
}

/**
 * Reads a count-prefixed list.
 *
 * A list has two framings and the schema says which: `fixedItemSize` means the
 * items are packed one after another at that stride, and its absence means they
 * are variable, so the count is followed by one `uint32` per item. Those offsets
 * are relative to the start of the list.
 */
function ReadList(context, offset, node) {
  const view = context.view;
  const count = view.getUint32(offset, true);
  const items = [];

  if (node.fixedItemSize === undefined) {
    let end = offset + 4 + count * 4;

    for (let index = 0; index < count; index += 1) {
      const at = offset + view.getUint32(offset + 4 + index * 4, true);
      const item = ReadValue(context, at, node.itemTypes);

      items.push(item.value);
      end = Math.max(end, at + item.size);
    }

    return { value: items, size: end - offset };
  }

  let cursor = offset + 4;

  for (let index = 0; index < count; index += 1) {
    items.push(ReadValue(context, cursor, node.itemTypes).value);
    cursor += node.fixedItemSize;
  }

  return { value: items, size: cursor - offset };
}

/**
 * Reads a keyed map.
 *
 * The framing is the same at the root of a container and nested inside one
 * record: a `uint32` of everything that follows, the values, then the key
 * footer, then a `uint32` of the footer's own size. **The footer is found from
 * the end, never from the front** — nothing at the front points at it.
 *
 * Each footer entry carries a key and an offset, and that offset is relative to
 * the end of the leading `uint32`, not to the file and not to the value region.
 */
function ReadDict(context, offset, node) {
  const view = context.view;
  const total = view.getUint32(offset, true);
  const base = offset + 4;
  const end = base + total;
  const footerSize = view.getUint32(end - 4, true);
  const footerStart = end - 4 - footerSize;

  if (footerStart < base) {
    throw SchemaBoundError("The key footer does not fit inside the container.", { footerStart, base });
  }

  const value = {};

  // The footer is an ordinary list, and it uses both of the list framings: a
  // list of integer keys is fixed-stride, a list of string keys is not.
  for (const entry of ReadList(context, footerStart, node.keyFooter).value) {
    value[entry.key] = ReadValue(context, base + entry.offset, node.valueTypes).value;
  }

  return { value, size: 4 + total };
}

/**
 * Reads a record.
 *
 * Fixed attributes sit at the offsets the schema names. Everything in
 * `attributesWithVariableOffsets` is reached through a table that follows the
 * fixed part, and **that table's length changes from record to record**: an
 * optional attribute whose presence bit is clear takes no slot in it. A reader
 * that assumes a constant stride decodes the first record correctly and then
 * drifts, which is the single most misleading property of this format.
 */
function ReadObject(context, offset, node) {
  const attributes = node.attributes ?? {};
  const variable = node.attributesWithVariableOffsets ?? [];
  const decoded = new Map();
  let size = node.size ?? node.endOfFixedSizeData ?? 0;

  for (const [ name, at ] of Object.entries(node.constantAttributeOffsets ?? {})) {
    decoded.set(name, ReadValue(context, offset + at, Attribute(attributes, name)).value);
  }

  if (variable.length) {
    const lookups = node.optionalValueLookups ?? {};
    const view = context.view;
    // The presence bitfield is written whenever a record has a variable section
    // at all, including where nothing in it is optional and the field is
    // therefore always zero. It is the offset table that shrinks, never this.
    const bits = view.getBigUint64(offset + node.endOfFixedSizeData, true);
    const table = offset + node.endOfFixedSizeData + 8;
    const present = variable.filter(name => {
      const attribute = Attribute(attributes, name);

      return !attribute.isOptional || (bits & BigInt(lookups[name] ?? 0)) !== 0n;
    });
    const data = table + present.length * 4;
    let end = data;

    present.forEach((name, index) => {
      const at = data + view.getUint32(table + index * 4, true);
      const read = ReadValue(context, at, Attribute(attributes, name));

      decoded.set(name, read.value);
      end = Math.max(end, at + read.size);
    });

    for (const name of variable) {
      const attribute = Attribute(attributes, name);

      // An absent optional takes the value the schema declares for it. Where no
      // default is declared the attribute is simply not part of this record -
      // which is what the published exports show for these same rows.
      if (!decoded.has(name) && Object.hasOwn(attribute, "default")) {
        decoded.set(name, attribute.default);
      }
    }

    size = end - offset;
  }

  // Declaration order, not the order the two passes above happened to fill.
  const value = {};

  for (const name of Object.keys(attributes)) {
    if (decoded.has(name)) value[name] = decoded.get(name);
  }

  return { value, size };
}

/** Looks up an attribute, naming the schema rather than failing on undefined. */
function Attribute(attributes, name) {
  const attribute = attributes[name];

  if (!attribute) {
    throw SchemaBoundError(`The schema offsets an attribute it never declares: ${name}.`, {
      attribute: name
    });
  }

  return attribute;
}

export default ReadValue;
