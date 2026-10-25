import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlueResMan, TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../../npm/dist/resource/formats/cmf/CjsCmfFormat.js";
import { CjsIncarnaEmulator, Tr2InteriorStatic } from "../../../npm/dist/character/index.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/index.js";
import { Tr2Effect, Tr2Vector2Parameter, TriTextureParameter } from "../../../npm/dist/trinity/shader/index.js";
import { Tr2Mesh, Tr2MeshArea } from "../../../npm/dist/trinity/index.js";
import { mat4 } from "../../../npm/dist/global/math/index.js";

/**
 * CjsIncarnaEmulator describes Incarna pieces as SOF data: a quad hull per
 * piece mesh, and an extension-class root whose layout places them.
 */

const GEOMETRY = "res:/graphics/interior/test/piece.gr2";

function geometry()
{
  const resource = new TriGeometryRes();
  resource.Initialize(GEOMETRY, "");
  resource.SetPayload(CjsCmfFormat.loadShared({
    meshes: [ 0, 10 ].map(offset => ({
      name: `mesh${offset}`,
      minBounds: [ offset, 0, 0 ],
      maxBounds: [ offset + 2, 2, 0 ],
      vertex: { position: [ offset, 0, 0, offset + 2, 0, 0, offset, 2, 0 ] },
      indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
    }))
  }));
  resource.MarkPrepared();
  return resource;
}

function piece()
{
  const effect = new Tr2Effect();
  for (const [ name, path ] of [ [ "OverlayMap", "res:/graphics/interior/test/piece_os.dds" ], [ "NormalMap", "res:/graphics/interior/test/piece_nm.dds" ],
    [ "DetailDiffuseMap", "res:/graphics/interior/test/plastic_ds.dds" ], [ "ReflectionMap", "" ] ])
  {
    const texture = new TriTextureParameter();
    texture.name = name;
    texture.resourcePath = path;
    effect.resources.push(texture);
  }
  const tile = new Tr2Vector2Parameter();
  tile.name = "DetailDiffuseTile";
  tile.value = [ 4, 1 ];
  effect.parameters.push(tile);

  const area = new Tr2MeshArea();
  area.name = "Base_Plastic_01";
  area.index = 2;
  area.count = 3;
  area.SetMaterial(effect);

  const mesh = new Tr2Mesh();
  mesh.geometryResPath = GEOMETRY;
  mesh.meshIndex = 1;
  mesh.SetGeometryRes(geometry());
  mesh.opaquePrepassAreas.push(area);

  const glass = new Tr2MeshArea();
  glass.name = "Base_Glass_01";
  glass.index = 5;
  glass.count = 1;
  glass.SetMaterial(effect);
  mesh.transparentAreas.push(glass);

  const object = new Tr2InteriorStatic();
  object.detailMeshes = [ mesh ];
  return object;
}

/** A data manager whose generic data lists the packed quad shaders, as EVE's does. */
function dataManager()
{
  const dataMgr = new EveSOFDataMgr();
  dataMgr.UpdateGeneric({ areaShaders: [
    { shader: "quad/quaddetailv5.fx", parameters: [ "Detail1Data" ] },
    { shader: "quad/quadglassv5.fx", parameters: [ "GeneralData" ] }
  ] });
  return dataMgr;
}

function emulate()
{
  const dataMgr = dataManager();
  const emulator = new CjsIncarnaEmulator(dataMgr, new CjsBlueResMan());
  const object = piece();
  const dna = emulator.AddAssembly("incarna_test", [
    { object, transform: mat4.create() },
    { object, transform: mat4.fromTranslation(mat4.create(), [ 5.25, 0, 0 ]) }
  ], "caldaribase", "caldari");
  return { dataMgr, dna };
}

test("an assembly's DNA names its root hull, the caller's faction and race, and its layout", () =>
{
  assert.equal(emulate().dna, "incarna_test:caldaribase:caldari:layout?incarna_test");
});

test("a piece mesh becomes a hull drawing that mesh alone, with quad areas", () =>
{
  const hull = emulate().dataMgr.GetHullData("incarna_piece_1");
  assert.equal(hull.geometryResFilePath, "dynamic:/mesh/1/res:/graphics/interior/test/piece.gr2");
  assert.deepEqual(Array.from(hull.boundingSphere).map(value => +value.toFixed(4)), [ 11, 1, 0, +Math.SQRT2.toFixed(4) ]);

  const [ area ] = hull.opaqueAreas;
  assert.deepEqual([ area.name, area.index, area.count, area.shader, area.areaType ], [ "Base_Plastic_01", 2, 3, "quad/unpacked_quaddetailv5.fx", 0 ]);
  const textures = Object.fromEntries([ ...area.textures ].map(([ name, texture ]) => [ name, texture.resFilePath ]));
  assert.deepEqual(textures, {
    AlbedoMap: "dynamic:/incarna/albedo/res:/graphics/interior/test/piece_os.dds",
    RoughnessMap: "dynamic:/incarna/roughness/res:/graphics/interior/test/piece_os.dds",
    MaterialMap: "dynamic:/incarna/material/res:/graphics/interior/test/piece_os.dds",
    GlowMap: "dynamic:/incarna/glow/res:/graphics/interior/test/piece_os.dds",
    NormalMap: "dynamic:/incarna/normal/res:/graphics/interior/test/piece_nm.dds",
    DirtMap: "dynamic:/incarna/dirt/res:/graphics/interior/test/piece_nm.dds",
    Detail1Map: "dynamic:/incarna/detail/res:/graphics/interior/test/plastic_ds.dds",
    Detail2Map: "dynamic:/color/0.5,0.5,0.5,0",
    Detail3Map: "dynamic:/color/0.5,0.5,0.5,0",
    PaintMaskMap: "dynamic:/color/0,0,0,1"
  });
  assert.deepEqual(Array.from(area.parameters.get("Detail1Data")).map(value => +value.toFixed(4)), [ 4, 0.8, 0, 0 ]);
  assert.deepEqual(Array.from(area.parameters.get("DetailSelector")), [ 1, 1, 1, 1 ]);
});

test("the root is a station drawing the first piece, and the layout places every other piece relative to it", () =>
{
  const { dataMgr } = emulate();
  const root = dataMgr.GetHullData("incarna_test");
  assert.equal(root.buildClass, 2);
  assert.equal(root.geometryResFilePath, "dynamic:/mesh/1/res:/graphics/interior/test/piece.gr2");
  assert.equal(root.opaqueAreas.length, 1);
  const locators = root.locatorSets.get("incarna_piece_1");
  assert.deepEqual(locators.map(locator => Array.from(locator.position)), [ [ 5.25, 0, 0 ] ]);

  const layout = dataMgr.GetLayoutData("incarna_test");
  assert.equal(layout.placements.length, 1);
  const [ placement ] = layout.placements;
  assert.deepEqual([ placement.descriptor.hull, placement.locatorSetName, placement.isInstanced ], [ "incarna_piece_1", "incarna_piece_1", false ]);
});

test("a first piece that does not sit at the origin places the others relative to it", () =>
{
  const dataMgr = dataManager();
  const emulator = new CjsIncarnaEmulator(dataMgr, new CjsBlueResMan());
  const object = piece();
  emulator.AddAssembly("incarna_test", [
    { object, transform: mat4.fromTranslation(mat4.create(), [ 2, 0, 0 ]) },
    { object, transform: mat4.fromTranslation(mat4.create(), [ 7, 1, 0 ]) }
  ], "caldaribase", "caldari");
  const [ locator ] = dataMgr.GetHullData("incarna_test").locatorSets.get("incarna_piece_1");
  assert.deepEqual(Array.from(locator.position), [ 5, 1, 0 ]);
});

test("a piece whose geometry has not loaded is refused", () =>
{
  const object = piece();
  object.detailMeshes[0].SetGeometryRes(null);
  const emulator = new CjsIncarnaEmulator(dataManager(), new CjsBlueResMan());
  assert.throws(() => emulator.AddAssembly("incarna_test", [ { object, transform: mat4.create() } ], "caldaribase", "caldari"), /must be loaded/);
});

test("each unpacked quad shader is listed with its packed one's generic entry", () =>
{
  const shaders = emulate().dataMgr.GetGenericData().areaShaderData;
  assert.equal(shaders.get("quad/unpacked_quaddetailv5.fx"), shaders.get("quad/quaddetailv5.fx"));
  assert.equal(shaders.get("quad/unpacked_quadglassv5.fx"), shaders.get("quad/quadglassv5.fx"));
});

test("a transparent area becomes a glass area, without the detail maps", () =>
{
  const [ glass ] = emulate().dataMgr.GetHullData("incarna_piece_1").transparentAreas;
  assert.deepEqual([ glass.name, glass.index, glass.count, glass.shader, glass.areaType ], [ "Base_Glass_01", 5, 1, "quad/unpacked_quadglassv5.fx", 1 ]);
  assert.deepEqual([ ...glass.textures.keys() ], [ "AlbedoMap", "RoughnessMap", "MaterialMap", "GlowMap", "NormalMap", "DirtMap", "PaintMaskMap" ]);
  assert.deepEqual([ ...glass.parameters.keys() ], [ "GeneralData" ]);
});

test("generic data without the packed quad shader is refused", () =>
{
  const emulator = new CjsIncarnaEmulator(new EveSOFDataMgr(), new CjsBlueResMan());
  assert.throws(() => emulator.AddAssembly("incarna_test", [ { object: piece(), transform: mat4.create() } ], "caldaribase", "caldari"), /has no quad\/quaddetailv5\.fx/);
});
