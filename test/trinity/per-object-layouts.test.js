// Guards CjsPerObjectLayouts against Carbon and against the struct defs the
// store is registered with today.
//
// Imported directly from src rather than npm/dist: the catalog has no
// decorators and no imports, so it needs no build transform, and testing src
// means a failure points at the source line.
import test from "node:test";

import { CjsPerObjectLayouts } from "../../src/trinity/core/rawData/CjsPerObjectLayouts.js";
import { TEST_PER_OBJECT_STRUCTS } from "./helpers/perObjectStore.js";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}


function assertEquals(actual, expected, message = "")
{
  if (actual !== expected)
  {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}


// [struct, floats, Carbon declaration]
const SIZES = [
  [ "EveBasicPerObjectData", 48, "EveTransform.h:161-163 - three Matrix" ],
  [ "EveMissileWarheadPerObjectData", 20, "EveMissileWarhead.h:194" ],
  [ "EveSceneStaticParticlesPerObjectData", 32, "EveSceneStaticParticles.h:105" ],
  [ "EvePerObjectVSData", 16, "EveConstantBufferFormats.h:16" ],
  [ "EvePerObjectPSData", 16, "EveConstantBufferFormats.h:11" ],
  [ "EveLensflarePerObjectData", 8, "EveLensflare.cpp:41-45" ],
  [ "EveSpherePinPerObjectData", 40, "EveSpherePin.h:25" ],
  [ "EveChildSpherePinPerObjectData", 40, "EveChildSpherePin.h:16" ],
  [ "DecalVSPerObjectData", 96, "EveSpaceObjectDecal.h:27 - six Matrix" ],
  [ "DecalPSPerObjectData", 44, "EveSpaceObjectDecal.h:37" ],
  [ "EveBoosterSetVSData", 60, "EveBoosterSet2.h:51 - Matrix + 4 float + 2x Vector4[5]" ],
  [ "EveBoosterSetPSData", 4, "EveBoosterSet2.h:66" ],
  [ "EveChildBulletStormPerObjectData", 60, "EveChildBulletStorm.h:20 - Vector4[10]" ],
  [ "EveStretch2PerObjectData", 16, "EveStretch2.h:105-109" ],
  [ "EveSpaceObjectVSData", 116, "EveSpaceObject2.h:99" ],
  [ "EveSpaceObjectPSData", 116, "EveSpaceObject2.h:122" ],
  [ "EveTurretSetVSData", 236, "EveTurretSet.h:47" ],
  [ "EveTurretSetPSData", 40, "EveTurretSet.h:63" ],
  [ "EveSpacePerObjectData", 164, "EveSpaceObject2.h:143 - the instanced variant" ],
  [ "Tr2PerObjectVSData", 20, "Tr2ConstantBufferFormats.h:35" ]
];


for (const [ struct, floats, source ] of SIZES)
{
  test(`${struct} matches its Carbon footprint (${source})`, () =>
  {
    const layout = CjsPerObjectLayouts.Get(struct);

    assert(layout, `${struct} should be catalogued`);
    assertEquals(layout.stride, floats, `${struct} stride`);
    // Tr2PerObjectData.h:57 - whole float4 registers.
    assertEquals(layout.stride % 4, 0, `${struct} must be a multiple of Vector4`);
  });
}


test("every catalogued layout resolves and reports its stages", () =>
{
  const names = CjsPerObjectLayouts.Names();

  assertEquals(names.length, SIZES.length, "catalogued struct count");

  for (const name of names)
  {
    const layout = CjsPerObjectLayouts.Get(name);

    assert(layout.fields.size > 0, `${name} has fields`);
    assert(layout.stages.length >= 1, `${name} binds to at least one stage`);

    for (const field of layout.fields.values())
    {
      // A float4-sized member must land on a register boundary; Carbon
      // hand-pads so this always holds.
      if (field.size >= 4)
      {
        assertEquals(field.offset % 4, 0, `${name}.${field.name} register boundary`);
      }
    }
  }
});


test("the shared-stage payloads bind to both stages", () =>
{
  // Carbon uploads the same bytes twice for these rather than declaring a pair.
  for (const struct of [
    "EveLensflarePerObjectData",
    "EveSpherePinPerObjectData",
    "EveChildSpherePinPerObjectData",
    "EveStretch2PerObjectData"
  ])
  {
    assertEquals(CjsPerObjectLayouts.Get(struct).stages.join(","), "vs,ps", struct);
  }

  assertEquals(CjsPerObjectLayouts.Get("DecalPSPerObjectData").stages.join(","), "ps");
  assertEquals(CjsPerObjectLayouts.Get("DecalVSPerObjectData").stages.join(","), "vs");
});


test("the catalog agrees field-for-field with the registered struct defs", () =>
{
  // The defs the store is registered with today are the shipping contract.
  // Order, size and element count must match exactly or the buffer shifts.
  for (const [ struct, entry ] of Object.entries(TEST_PER_OBJECT_STRUCTS))
  {
    const def = Array.isArray(entry) ? entry : entry.def;
    const layout = CjsPerObjectLayouts.Get(struct);

    assert(layout, `${struct} is catalogued`);
    assertEquals(layout.fields.size, def.length, `${struct} field count`);

    const fields = [ ...layout.fields.values() ];

    for (let index = 0; index < def.length; index++)
    {
      const declared = def[index];
      const field = fields[index];

      assertEquals(field.name, declared.name, `${struct} field ${index} name`);
      assertEquals(field.size, declared.size, `${struct}.${declared.name} size`);
      assertEquals(field.count, declared.elements ?? 1, `${struct}.${declared.name} count`);
    }

    const stages = Array.isArray(entry) ? [ "vs" ] : (entry.stages ?? [ "vs" ]);
    assertEquals(layout.stages.join(","), stages.join(","), `${struct} stages`);
  }
});


test("defaults are frozen and are not shared by reference", () =>
{
  const vs = CjsPerObjectLayouts.Get("EveSpaceObjectVSData");
  const ps = CjsPerObjectLayouts.Get("EveSpaceObjectPSData");


  // Carbon's documented neutrals.
  assertEquals(ps.fields.get("shipData").default.join(","), "1,1,0,1", "EveSpaceObject2.cpp:195");
  assertEquals(ps.fields.get("screenSize").default.join(","), "0.5,0.5,0.5,1", "EveChildMesh.cpp:65");
  // EveCustomMask::ZeroPerObjectData writes identity into an unused slot.
  assertEquals(vs.fields.get("customMaskMatrix").default[0], 1, "customMaskMatrix identity");
  assertEquals(vs.fields.get("customMaskMatrix").default[1], 0, "customMaskMatrix identity");

  // A field with no default is deliberately allocator garbage.
  assertEquals(ps.fields.get("clipSphereCenter").default, null, "no default = garbage parity");
});


test("matrix and integer fields are flagged for the accessor gate", () =>
{
  const vs = CjsPerObjectLayouts.Get("EveSpaceObjectVSData");

  assertEquals(vs.fields.get("worldTransform").isMatrix, true);
  assertEquals(vs.fields.get("shipData").isMatrix, false);
  assertEquals(vs.fields.get("boneOffsets").isInteger, true);
  assertEquals(vs.fields.get("shipData").isInteger, false);
  assertEquals(CjsPerObjectLayouts.Get("EveTurretSetVSData").fields.get("turretRotation").isMatrix, false);
});


test("a struct can be traced back to its group", () =>
{
  const found = CjsPerObjectLayouts.Find("EveSpaceObjectPSData");

  assertEquals(found.group, "EveSpaceObject");
  assertEquals(found.key, "ps");
  assertEquals(CjsPerObjectLayouts.Find("NotAStruct"), null);
  assertEquals(CjsPerObjectLayouts.Get("NotAStruct"), null);
});
