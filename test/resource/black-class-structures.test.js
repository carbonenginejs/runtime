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

test("where the snapshot also has a layout, the class layout agrees with it", () =>
{
  for (const [ owner, field ] of [ [ "Tr2CurveScalar", "keys" ], [ "Tr2CurveQuaternion", "keys" ] ])
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
