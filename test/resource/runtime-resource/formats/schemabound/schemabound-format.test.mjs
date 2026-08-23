import assert from "node:assert/strict";
import { test } from "node:test";

import CjsSchemaBoundFormat, {
  CjsSchemaBoundFormat as NamedCjsSchemaBoundFormat
} from "../../../../../src/resource/formats/schemabound/index.js";

/**
 * These containers are laid out byte by byte rather than produced by an encoder.
 *
 * There is no encoder to use and no oracle to check against: nothing else reads
 * this family, and the client files that do exist cannot ship in a public
 * package. Writing the bytes out by hand keeps the fixtures independent of the
 * reader - a round trip through an encoder built from the same understanding
 * would agree with itself whether or not either was right.
 *
 * The reader was separately verified against a full set of client containers,
 * field for field against the published static data export. That evidence lives
 * in the organization's documentation; what these tests hold is the structure,
 * including the cases ordinary data never produces.
 */

const u8 = value => [ value & 0xff ];
const u32 = value => [ value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff ];
const u64 = value => [ ...u32(value), 0, 0, 0, 0 ];
const f32 = value => Array.from(new Uint8Array(Float32Array.of(value).buffer));
const f64 = value => Array.from(new Uint8Array(Float64Array.of(value).buffer));
const text = value => Array.from(new TextEncoder().encode(value));
const str = value => [ ...u32(text(value).length), ...text(value) ];
const bytes = (...parts) => Uint8Array.from(parts.flat());

/** Wraps a value region and a key footer into the container framing. */
function Container(values, footer) {
  const total = values.length + footer.length + 4;

  return bytes(u32(total), values, footer, u32(footer.length));
}

const KEY_FOOTER = {
  fixedItemSize: 8,
  type: "list",
  itemTypes: {
    type: "object",
    attributes: { key: { min: 0, size: 4, type: "int" }, offset: { min: 0, size: 4, type: "int" } },
    constantAttributeOffsets: { key: 0, offset: 4 },
    attributesWithVariableOffsets: [],
    optionalValueLookups: {},
    endOfFixedSizeData: 8
  }
};

test("package subpath exports one public class", async () => {
  const module = await import("../../../../../src/resource/formats/schemabound/index.js");

  assert.deepEqual(Object.keys(module).sort(), [ "CjsSchemaBoundFormat", "default" ]);
  assert.equal(module.default, CjsSchemaBoundFormat);
  assert.equal(NamedCjsSchemaBoundFormat, CjsSchemaBoundFormat);
});

test("the offset table shrinks when an optional is absent", () => {
  // The trap this format sets. Record 1 carries both optionals and so has three
  // slots in its offset table; record 2 carries neither and has one. Their
  // variable data therefore begins at different distances from the record start,
  // and a reader that assumes a constant stride gets the first record right and
  // every record after it wrong.
  const schema = {
    type: "dict",
    keyTypes: { min: 0, size: 4, type: "int" },
    keyFooter: KEY_FOOTER,
    valueTypes: {
      type: "object",
      attributes: {
        id: { min: 0, size: 4, type: "int" },
        alpha: { isOptional: true, min: 0, size: 4, type: "int" },
        beta: { isOptional: true, type: "string" },
        tags: { type: "list", fixedItemSize: 4, itemTypes: { min: 0, size: 4, type: "int" } }
      },
      constantAttributeOffsets: { id: 0 },
      attributesWithVariableOffsets: [ "alpha", "beta", "tags" ],
      optionalValueLookups: { alpha: 1, beta: 2 },
      endOfFixedSizeData: 4,
      maxBitFieldValue: 2
    }
  };

  const first = [
    u32(1), // id
    u64(3), // both optionals present
    u32(0), u32(4), u32(11), // three slots: alpha, beta, tags
    u32(10), // alpha
    str("hey"), // beta, unaligned on purpose - offsets are explicit, not padded
    u32(2), u32(7), u32(8) // tags
  ].flat();
  const second = [
    u32(2), // id
    u64(0), // neither optional present
    u32(0), // one slot: tags
    u32(1), u32(9)
  ].flat();

  assert.equal(first.length, 47);
  assert.equal(second.length, 24);

  const container = Container(
    [ ...first, ...second ],
    [ u32(2), u32(1), u32(0), u32(2), u32(47) ].flat()
  );

  assert.deepEqual(CjsSchemaBoundFormat.read(container, { schema }), {
    1: { id: 1, alpha: 10, beta: "hey", tags: [ 7, 8 ] },
    2: { id: 2, tags: [ 9 ] }
  });
});

test("an absent optional takes its declared default, or no key at all", () => {
  const schema = {
    type: "dict",
    keyTypes: { min: 0, size: 4, type: "int" },
    keyFooter: KEY_FOOTER,
    valueTypes: {
      type: "object",
      attributes: {
        id: { min: 0, size: 4, type: "int" },
        named: { isOptional: true, default: "", type: "string" },
        // Declared with no default, exactly as the client's own schemas do for
        // a description that simply is not there.
        note: { isOptional: true, type: "string" }
      },
      constantAttributeOffsets: { id: 0 },
      attributesWithVariableOffsets: [ "named", "note" ],
      optionalValueLookups: { named: 1, note: 2 },
      endOfFixedSizeData: 4,
      maxBitFieldValue: 2
    }
  };
  const record = [ u32(7), u64(0) ].flat();
  const container = Container(record, [ u32(1), u32(7), u32(0) ].flat());
  const decoded = CjsSchemaBoundFormat.read(container, { schema });

  assert.deepEqual(decoded, { 7: { id: 7, named: "" } });
  assert.equal("note" in decoded[7], false, "an optional with no default is left off the record");
});

test("a fixed-stride list root reads every scalar type the schemas use", () => {
  const schema = {
    type: "list",
    fixedItemSize: 42,
    itemTypes: {
      type: "object",
      attributes: {
        count: { min: 0, size: 4, type: "int" },
        signed: { size: 4, type: "int" },
        ratio: { size: 4, type: "float" },
        flag: { size: 1, type: "bool" },
        kind: { size: 1, type: "enum", values: { near: 0, far: 1 } },
        code: { size: 1, type: "enum", readEnumValue: true, values: { near: 0, far: 1 } },
        at: { aliases: { x: 0, y: 1, z: 2 }, precision: "double", size: 24, type: "vector3" }
      },
      constantAttributeOffsets: { count: 0, signed: 4, ratio: 8, flag: 12, kind: 13, code: 14, at: 18 },
      attributesWithVariableOffsets: [],
      optionalValueLookups: {},
      endOfFixedSizeData: 42,
      size: 42
    }
  };
  const item = (count, signed, flag, kind) => [
    u32(count), u32(signed >>> 0), f32(0.5), u8(flag), u8(kind), u8(kind), u8(0), u8(0), u8(0),
    f64(1), f64(2), f64(3)
  ].flat();
  const container = bytes(u32(2), item(3, -1, 1, 1), item(4, -2, 0, 0));
  const decoded = CjsSchemaBoundFormat.read(container, { schema });

  assert.equal(decoded.length, 2);
  assert.deepEqual(decoded[0], {
    count: 3,
    // `min: 0` is the only signedness the schema states; without it, negative.
    signed: -1,
    ratio: 0.5,
    flag: true,
    // `readEnumValue` is the schema saying the number is the meaning.
    kind: "far",
    code: 1,
    at: { x: 1, y: 2, z: 3 }
  });
  assert.deepEqual(decoded[1].kind, "near");
  assert.equal(decoded[1].signed, -2);
});

test("a list of variable items carries its own offset table", () => {
  // A list states `fixedItemSize` when its items are packed at a stride. Where
  // it does not, the count is followed by one offset per item, measured from the
  // start of the list - which is how a container with string keys indexes itself.
  const schema = {
    type: "dict",
    keyTypes: { type: "string" },
    keyFooter: {
      type: "list",
      itemTypes: {
        type: "object",
        attributes: { offset: { min: 0, size: 4, type: "int" }, key: { type: "string" } },
        constantAttributeOffsets: { offset: 0 },
        attributesWithVariableOffsets: [ "key" ],
        // Nothing here is optional, and the presence bitfield is still written.
        optionalValueLookups: {},
        endOfFixedSizeData: 4
      }
    },
    valueTypes: { min: 0, size: 4, type: "int" }
  };
  const values = [ u32(101), u32(102) ].flat();
  const entry = (offset, key) => [ u32(offset), u64(0), u32(0), str(key) ].flat();
  const first = entry(0, "left");
  const second = entry(4, "right");
  const footer = [
    u32(2),
    // Two slots, so the items begin twelve bytes into the list.
    u32(12), u32(12 + first.length),
    first, second
  ].flat();

  assert.deepEqual(CjsSchemaBoundFormat.read(Container(values, footer), { schema }), {
    left: 101,
    right: 102
  });
});

test("a dict nested inside a record uses the same framing as the file", () => {
  const inner = {
    type: "dict",
    keyTypes: { min: 0, size: 4, type: "int" },
    keyFooter: KEY_FOOTER,
    valueTypes: { min: 0, size: 4, type: "int" }
  };
  const schema = {
    type: "dict",
    keyTypes: { min: 0, size: 4, type: "int" },
    keyFooter: KEY_FOOTER,
    valueTypes: {
      type: "object",
      attributes: { id: { min: 0, size: 4, type: "int" }, byType: inner },
      constantAttributeOffsets: { id: 0 },
      attributesWithVariableOffsets: [ "byType" ],
      optionalValueLookups: {},
      endOfFixedSizeData: 4
    }
  };
  const nested = Array.from(Container([ u32(5), u32(6) ].flat(), [ u32(2), u32(90), u32(0), u32(91), u32(4) ].flat()));
  const record = [ u32(1), u64(0), u32(0), nested ].flat();

  assert.deepEqual(CjsSchemaBoundFormat.read(Container(record, [ u32(1), u32(1), u32(0) ].flat()), { schema }), {
    1: { id: 1, byType: { 90: 5, 91: 6 } }
  });
});

test("a schema is accepted as YAML, and its anchors are rejoined", () => {
  // A schema that declares two vectors writes the component aliases once and
  // refers back to them. Left unresolved, the anchor reads as a fourth component
  // and the alias as a declaration with no components at all.
  const schema = [
    "fixedItemSize: 48",
    "type: list",
    "itemTypes:",
    "  attributes:",
    "    from: {aliases: &id001 {x: 0, y: 1, z: 2}, precision: double, size: 24, type: vector3}",
    "    to: {aliases: *id001, precision: double, size: 24, type: vector3}",
    "  attributesWithVariableOffsets: []",
    "  constantAttributeOffsets: {from: 0, to: 24}",
    "  optionalValueLookups: {}",
    "  endOfFixedSizeData: 48",
    "  size: 48",
    "  type: object",
    ""
  ].join("\n");
  const container = bytes(u32(1), f64(1), f64(2), f64(3), f64(4), f64(5), f64(6));

  assert.deepEqual(CjsSchemaBoundFormat.read(container, { schema }), [
    { from: { x: 1, y: 2, z: 3 }, to: { x: 4, y: 5, z: 6 } }
  ]);

  // The same schema as bytes, which is how it arrives from a resource.
  assert.deepEqual(
    CjsSchemaBoundFormat.read(container, { schema: new TextEncoder().encode(schema) }),
    CjsSchemaBoundFormat.read(container, { schema })
  );
});

test("a wide integer is a BigInt in payload form and a string in JSON form", () => {
  const schema = {
    type: "list",
    fixedItemSize: 8,
    itemTypes: { min: 0, size: 8, type: "int" }
  };
  const container = bytes(u32(2), [ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0 ], [ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f ]);

  assert.deepEqual(CjsSchemaBoundFormat.readPayload(container, { schema }), [
    // Exactly Number.MAX_SAFE_INTEGER, so a Number still loses nothing.
    9007199254740991,
    9223372036854775807n
  ]);
  assert.deepEqual(CjsSchemaBoundFormat.readJSON(container, { schema })[1], "9223372036854775807");
});

test("a resPath reads as its own length-prefixed string", () => {
  const schema = {
    type: "list",
    itemTypes: { type: "resPath" }
  };
  const path = str("res:/dx9/scene/universe/a13_cube.red");
  const container = bytes(u32(1), u32(4 + 4), path);

  assert.deepEqual(CjsSchemaBoundFormat.read(container, { schema }), [ "res:/dx9/scene/universe/a13_cube.red" ]);
});

test("the schema is required, and is what this format reports on", () => {
  const container = bytes(u32(0));

  assert.throws(
    () => CjsSchemaBoundFormat.read(container, {}),
    error => error.code === "CJS_SCHEMA_BOUND_FORMAT_INVALID"
  );

  // These bytes carry no signature at all, so the answer is about the schema.
  assert.equal(CjsSchemaBoundFormat.is({ type: "list", itemTypes: { size: 4, type: "int" } }), true);
  assert.equal(CjsSchemaBoundFormat.is({ type: "int", size: 4 }), false);
  assert.equal(CjsSchemaBoundFormat.is(null), false);

  const probe = CjsSchemaBoundFormat.getSupport({ type: "dict" });

  assert.equal(probe.format, "schemabound");
  assert.equal(probe.supported, true);
  assert.equal(probe.metadata.requiresSchema, true);
});

test("a schema this reader cannot follow fails, rather than inventing values", () => {
  assert.throws(
    () => CjsSchemaBoundFormat.read(bytes(u32(1), u32(0)), {
      schema: { type: "list", fixedItemSize: 4, itemTypes: { type: "decimal", size: 4 } }
    }),
    error => error.code === "CJS_SCHEMA_BOUND_FORMAT_INVALID" && error.schemaType === "decimal"
  );

  assert.throws(
    () => CjsSchemaBoundFormat.read(bytes(u32(1), u32(0)), {
      schema: {
        type: "list",
        fixedItemSize: 4,
        itemTypes: {
          type: "object",
          attributes: {},
          constantAttributeOffsets: { missing: 0 },
          attributesWithVariableOffsets: [],
          optionalValueLookups: {},
          endOfFixedSizeData: 4
        }
      }
    }),
    error => error.attribute === "missing"
  );

  assert.throws(
    () => CjsSchemaBoundFormat.read("not bytes", { schema: { type: "list", itemTypes: {} } }),
    error => error.code === "CJS_SCHEMA_BOUND_FORMAT_INVALID"
  );
});

test("reads the identifier, unicode and two-component vector types", () =>
{
  // These come from the containers whose schema ships embedded as a pickle
  // rather than beside them as YAML. They are the same format; the extra type
  // names are the schema stating what a number MEANS where the YAML ones state
  // only its width. An identifier that declares no size at all is four bytes.
  const schema = {
    type: "list",
    fixedItemSize: 28,
    itemTypes: {
      type: "object",
      attributes: {
        nameID: { type: "localizationID", size: 4 },
        owner: { type: "factionID" },
        what: { type: "typeID", size: 4 },
        at: { type: "vector2", precision: "double", size: 16 }
      },
      constantAttributeOffsets: { nameID: 0, owner: 4, what: 8, at: 12 },
      attributesWithVariableOffsets: [],
      optionalValueLookups: {},
      endOfFixedSizeData: 28
    }
  };
  const container = bytes(u32(1), u32(268957), u32(500007), u32(11), f64(1.5), f64(-2.5));

  assert.deepEqual(CjsSchemaBoundFormat.read(container, { schema }), [
    { nameID: 268957, owner: 500007, what: 11, at: { x: 1.5, y: -2.5 } }
  ]);

  // `unicode` is Python's distinction, not the container's: same framing as a
  // string, and the same decode.
  assert.deepEqual(
    CjsSchemaBoundFormat.read(
      // One variable item, so a count and one offset measured from the list start.
      bytes(u32(1), u32(8), str("Jita")),
      { schema: { type: "list", itemTypes: { type: "unicode" } } }
    ),
    [ "Jita" ]
  );
});
