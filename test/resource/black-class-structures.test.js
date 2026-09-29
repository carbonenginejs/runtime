// Struct-list layouts derived from the runtime's decorated classes
// (resource/formats/black/core/blackClassStructures.js).
import assert from "node:assert/strict";
import test from "node:test";

import "../../npm/dist/trinity/index.js";
import { classStructureLayout } from "../../npm/dist/resource/formats/black/core/blackClassStructures.js";
import { definitions } from "../../npm/dist/resource/formats/black/core/blackDefinitions.js";
import { CjsBlackPropertyReaders } from "../../npm/dist/resource/formats/black/core/CjsBlackPropertyReaders.js";
import { CjsBlackBinaryReader } from "../../npm/dist/resource/formats/black/core/CjsBlackBinaryReader.js";

const offsets = layout => layout.members.map(member => [ member.name, member.offset ]);

test("derived offsets match Carbon's BlueStructureDefinitions", () =>
{
  // LocatorStructureDef, EveLocatorSets.cpp:32-39 (partTag from trinity a9a60056).
  const locator = classStructureLayout("EveLocatorSets", "locators");
  assert.deepEqual(offsets(locator), [ [ "position", 0 ], [ "direction", 12 ], [ "scale", 28 ], [ "boneIndex", 40 ], [ "partTag", 44 ] ]);
  assert.equal(locator.size, 48);
  // The same list before a9a60056, and LocatorStructureWithScaleDef
  // (EveDistributionPlacementGeneratorLocators.cpp:6-12): 44 bytes, a member boundary.
  assert.ok(locator.boundaries.includes(44));
  assert.deepEqual(offsets(classStructureLayout("EveDistributionPlacementGeneratorLocators", "locators")).slice(0, 4), offsets(locator).slice(0, 4));

  // Tr2CurveScalarKeyDef (Tr2CurveScalar.cpp:11-20), Tr2CurveQuaternionKeyDef (Tr2CurveQuaternion.cpp:11-17).
  assert.deepEqual(offsets(classStructureLayout("Tr2CurveScalar", "keys")),
    [ [ "time", 0 ], [ "value", 4 ], [ "leftTangent", 8 ], [ "rightTangent", 12 ], [ "id", 16 ], [ "interpolation", 18 ], [ "tangentType", 19 ] ]);
  assert.deepEqual(offsets(classStructureLayout("Tr2CurveQuaternion", "keys")),
    [ [ "time", 0 ], [ "value", 4 ], [ "id", 20 ], [ "interpolation", 22 ] ]);
});

test("Tr2Effect's struct lists derive with 8-byte shared strings, as Carbon's definitions give", () =>
{
  // Tr2ShaderOptionStructureDef (Tr2Effect.cpp:110-114).
  assert.deepEqual(offsets(classStructureLayout("Tr2Effect", "options")), [ [ "name", 0 ], [ "value", 8 ] ]);
  assert.equal(classStructureLayout("Tr2Effect", "options").size, 16);
  // Tr2EffectParameterStructureDef (Tr2Effect.cpp:33-37).
  assert.deepEqual(offsets(classStructureLayout("Tr2Effect", "constParameters")), [ [ "name", 0 ], [ "value", 8 ] ]);
  assert.equal(classStructureLayout("Tr2Effect", "constParameters").size, 24);
  // Tr2SamplerOverrideStructureDef (Tr2Effect.cpp:84-95, offsetof on
  // Tr2SamplerOverride). Carbon's address/filter members are UINT32; the class
  // declares int32 enums of the same width.
  assert.deepEqual(offsets(classStructureLayout("Tr2Effect", "samplerOverrides")), [
    [ "name", 0 ], [ "addressU", 8 ], [ "addressV", 12 ], [ "addressW", 16 ], [ "filter", 20 ],
    [ "mipFilter", 24 ], [ "lodBias", 28 ], [ "maxMipLevel", 32 ], [ "maxAnisotropy", 36 ]
  ]);
  assert.equal(classStructureLayout("Tr2Effect", "samplerOverrides").size, 56, "Tr2Effect.h:37 includes the trailing Tr2SamplerStateAL shared_ptr");
});

test("where the snapshot also has a layout, the class layout agrees with it", () =>
{
  for (const [ owner, field ] of [ [ "Tr2CurveScalar", "keys" ], [ "Tr2CurveQuaternion", "keys" ], [ "Tr2Effect", "options" ], [ "Tr2Effect", "constParameters" ] ])
  {
    const snapshot = definitions.classes[owner][field].structure;
    const derived = classStructureLayout(owner, field);
    assert.equal(derived.size, snapshot.size, `${owner}.${field} size`);
    assert.deepEqual(derived.members.map(({ name, offset, type }) => ({ name, offset, type })), snapshot.members, `${owner}.${field} members`);
  }
});

test("a record ending on a member boundary reads its members and defaults the rest; any other size throws", () =>
{
  const layout = classStructureLayout("EveLocatorSets", "locators");
  const list = (count, size, fill) =>
  {
    const bytes = new Uint8Array(6 + count * size);
    const view = new DataView(bytes.buffer);
    view.setInt32(0, count, true);
    view.setUint16(4, size, true);
    fill?.(view);
    return new CjsBlackBinaryReader(view);
  };

  const [ old ] = CjsBlackPropertyReaders.readStructureList(list(1, 44, view => view.setInt32(6 + 40, 7, true)), { structure: layout });
  assert.equal(old.boneIndex, 7);
  assert.equal(old.partTag, 0, "NO_PART_TAG, the class default (EveSpaceObjectChild.h:76)");

  assert.throws(() => CjsBlackPropertyReaders.readStructureList(list(1, 42), { structure: layout }), /Incompatible Black structure/);
});

test("sampler records advance by native sizeof while ignoring trailing runtime storage", () =>
{
  const layout = classStructureLayout("Tr2Effect", "samplerOverrides");
  const bytes = new Uint8Array(6 + 2 * 56 + 4);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, 2, true);
  view.setUint16(4, 56, true);
  for (let index = 0; index < 2; index += 1)
  {
    const start = 6 + index * 56;
    view.setUint16(start, index, true);
    view.setUint32(start + 8, index + 1, true);
    view.setFloat32(start + 28, index + 0.25, true);
    view.setUint32(start + 36, index + 8, true);
    bytes.fill(0xab, start + 40, start + 56);
  }
  view.setUint32(118, 0x12345678, true);
  const reader = new CjsBlackBinaryReader(view, { info: { strings: [ "first", "second" ] } });
  const values = CjsBlackPropertyReaders.readStructureList(reader, { structure: layout });
  assert.deepEqual(values.map(value => [ value.name, value.addressU, value.lodBias, value.maxAnisotropy ]),
    [ [ "first", 1, 0.25, 8 ], [ "second", 2, 1.25, 9 ] ]);
  assert.equal(reader.ReadU32(), 0x12345678, "BlackWriter.cpp:299-304 writes the full stride for every record");
  assert.ok(values.every(value => !Object.hasOwn(value, "sampler")), "native pointers are never hydrated");
  view.setUint16(4, 55, true);
  assert.throws(() => CjsBlackPropertyReaders.readStructureList(new CjsBlackBinaryReader(view), { structure: layout }), /Incompatible Black structure/);
});
