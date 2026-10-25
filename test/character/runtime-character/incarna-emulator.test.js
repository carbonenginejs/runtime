import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlueResMan, TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../../npm/dist/resource/formats/cmf/CjsCmfFormat.js";
import { CjsIncarnaEmulator, Tr2InteriorStatic } from "../../../npm/dist/character/index.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/index.js";
import { Tr2Effect, Tr2Vector2Parameter, Tr2Vector4Parameter, TriTextureParameter } from "../../../npm/dist/trinity/shader/index.js";
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

/**
 * The Tr2Effect an Incarna material becomes, with the piece's maps; an opaque
 * material has a glow colour, a transparent one none.
 */
function material(glowColor = null)
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
  if (glowColor)
  {
    const glow = new Tr2Vector4Parameter();
    glow.name = "MaterialGlowColor";
    glow.value = glowColor;
    effect.parameters.push(glow);
  }
  return effect;
}

function piece(glowColor = [ 0.7, 0.88, 1, 1 ])
{
  const area = new Tr2MeshArea();
  area.name = "Base_Plastic_01";
  area.index = 2;
  area.count = 3;
  area.SetMaterial(material(glowColor));

  const mesh = new Tr2Mesh();
  mesh.geometryResPath = GEOMETRY;
  mesh.meshIndex = 1;
  mesh.SetGeometryRes(geometry());
  mesh.opaquePrepassAreas.push(area);

  const glass = new Tr2MeshArea();
  glass.name = "Base_Glass_01";
  glass.index = 5;
  glass.count = 1;
  glass.SetMaterial(material());
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
    DirtMap: "dynamic:/color/0,0,0,1",
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
  assert.equal(glass.textures.get("PaintMaskMap").resFilePath, "dynamic:/color/0.62,0,0,1", "the quad glass's alpha is 1 - PaintMaskMap.r");
  assert.equal(emulate().dataMgr.GetHullData("incarna_piece_1").opaqueAreas[0].textures.get("PaintMaskMap").resFilePath, "dynamic:/color/0,0,0,1");
  assert.deepEqual([ ...glass.parameters.keys() ], [ "GeneralData" ]);
});

test("generic data without the packed quad shader is refused", () =>
{
  const emulator = new CjsIncarnaEmulator(new EveSOFDataMgr(), new CjsBlueResMan());
  assert.throws(() => emulator.AddAssembly("incarna_test", [ { object: piece(), transform: mat4.create() } ], "caldaribase", "caldari"), /has no quad\/quaddetailv5\.fx/);
});

test("an area shows its glow mask only when its material has a glow colour that is not black", () =>
{
  const glowMap = area => area.textures.get("GlowMap").resFilePath;
  const hull = emulate().dataMgr.GetHullData("incarna_piece_1");
  assert.equal(glowMap(hull.opaqueAreas[0]), "dynamic:/incarna/glow/res:/graphics/interior/test/piece_os.dds");
  assert.equal(glowMap(hull.transparentAreas[0]), "dynamic:/color/0,0,0,1", "a transparent material has no glow colour");

  const dataMgr = dataManager();
  new CjsIncarnaEmulator(dataMgr, new CjsBlueResMan()).AddAssembly("incarna_test", [ { object: piece([ 0, 0, 0, 1 ]), transform: mat4.create() } ], "caldaribase", "caldari");
  assert.equal(glowMap(dataMgr.GetHullData("incarna_test").opaqueAreas[0]), "dynamic:/color/0,0,0,1");
});

test("an assembly's lights become one light set of point lights on its root", () =>
{
  assert.deepEqual(emulate().dataMgr.GetHullData("incarna_test").hullLightSets, []);

  const dataMgr = dataManager();
  new CjsIncarnaEmulator(dataMgr, new CjsBlueResMan()).AddAssembly("incarna_test", [ { object: piece(), transform: mat4.create() } ], "caldaribase", "caldari", [
    { position: [ 1, 2, 3 ], radius: 0.4, innerRadius: 0.2, brightness: 4, lightColor: 20 },
    { position: [ 1, 2, -3 ], radius: 0.4, innerRadius: 0.2, brightness: 4, lightColor: 20 }
  ]);
  const [ set, ...others ] = dataMgr.GetHullData("incarna_test").hullLightSets;
  assert.equal(others.length, 0);
  assert.equal(set.visibilityGroupName, "primary");
  assert.deepEqual(set.items.map(item => [ item.type, Array.from(item.position), +item.radius.toFixed(4), +item.innerRadius.toFixed(4), item.brightness, item.lightColor ]), [
    [ 0, [ 1, 2, 3 ], 0.4, 0.2, 4, 20 ],
    [ 0, [ 1, 2, -3 ], 0.4, 0.2, 4, 20 ]
  ]);
});

/** A resource manager serving every glow mask as an 8 by 4 texture whose right column glows, recording what it is asked for. */
function glowResources()
{
  const data = new Uint8Array(32);
  for (let row = 0; row < 4; row++) data[row * 8 + 7] = 255;
  const requests = [];
  return {
    requests,
    RegisterResourceConstructor() {},
    GetResource(path)
    {
      requests.push(path);
      return { Ready: async () => null, GetBitmap: () => ({ GetMipRawData: () => data, GetWidth: () => 8, GetHeight: () => 4 }) };
    }
  };
}

/**
 * A piece whose glowing area is a 2 by 1 metre quad facing up, x 0 to 2 and z
 * 0.5 to 1.5, mapped once: its glowing column is the line x 1.875. Its glass,
 * which has no glow colour, maps the same.
 */
function glowingPiece()
{
  const path = "res:/graphics/interior/test/glow.gr2";
  const resource = new TriGeometryRes();
  resource.Initialize(path, "");
  resource.SetPayload(CjsCmfFormat.loadShared({ meshes: [ {
    name: "glow",
    minBounds: [ 0, 0, 0.5 ],
    maxBounds: [ 2, 0, 1.5 ],
    vertex: {
      position: [ 0, 0, 0.5, 2, 0, 0.5, 2, 0, 1.5, 0, 0, 1.5 ],
      normal: [ 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ],
      texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ]
    },
    indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2, 0, 2, 3 ] } ]
  } ] }));
  resource.MarkPrepared();

  const mesh = new Tr2Mesh();
  mesh.geometryResPath = path;
  mesh.meshIndex = 0;
  mesh.SetGeometryRes(resource);
  for (const [ list, glowColor ] of [ [ mesh.opaquePrepassAreas, [ 1, 1, 1, 1 ] ], [ mesh.transparentAreas, null ] ])
  {
    const area = new Tr2MeshArea();
    area.index = 0;
    area.count = 1;
    area.SetMaterial(material(glowColor));
    list.push(area);
  }
  const object = new Tr2InteriorStatic();
  object.detailMeshes = [ mesh ];
  return object;
}

const roundPositions = positions => positions.map(position => Array.from(position, value => +value.toFixed(4)));

test("a glow light sits in front of each stretch of glow, in the root's space", async () =>
{
  const resources = glowResources();
  const pieces = [ { object: glowingPiece(), transform: mat4.fromTranslation(mat4.create(), [ 3, 0, 0 ]) } ];
  assert.deepEqual(roundPositions(await CjsIncarnaEmulator.findGlowLightPositions(resources, pieces, { spacing: 4 })), [ [ 1.875, 0.1, 1 ] ]);
  assert.deepEqual(roundPositions(await CjsIncarnaEmulator.findGlowLightPositions(resources, pieces)), [ [ 1.875, 0.1, 0.75 ], [ 1.875, 0.1, 1.25 ] ], "a strip longer than the spacing takes a row");
  assert.deepEqual([ ...new Set(resources.requests) ], [ "dynamic:/incarna/glow/res:/graphics/interior/test/piece_os.dds" ]);
});

test("mirrored, glow found on the positive side is mirrored, and glow on the plane is lit once", async () =>
{
  const resources = glowResources();
  const options = { spacing: 4, mirror: 2 };
  const beside = [ { object: glowingPiece(), transform: mat4.create() } ];
  assert.deepEqual(roundPositions(await CjsIncarnaEmulator.findGlowLightPositions(resources, beside, options)), [ [ 1.875, 0.1, -1 ], [ 1.875, 0.1, 1 ] ]);

  // Turned a quarter about y and moved 1.9 along z, the glowing line runs along x at z 0.025.
  const turned = mat4.rotateY(mat4.create(), mat4.fromTranslation(mat4.create(), [ 0, 0, 1.9 ]), Math.PI / 2);
  const across = [ { object: piece([ 0, 0, 0, 1 ]), transform: mat4.create() }, { object: glowingPiece(), transform: turned } ];
  assert.deepEqual(roundPositions(await CjsIncarnaEmulator.findGlowLightPositions(resources, across, options)), [ [ 1, 0.1, 0 ] ]);
});

/** A piece that is a room 8 m long, 4 m wide and 4 m high: a floor facing up at y 0 and a ceiling facing down at y 4. */
function roomPiece()
{
  const path = "res:/graphics/interior/test/room.gr2";
  const resource = new TriGeometryRes();
  resource.Initialize(path, "");
  resource.SetPayload(CjsCmfFormat.loadShared({ meshes: [ {
    name: "room",
    minBounds: [ 0, 0, -2 ],
    maxBounds: [ 8, 4, 2 ],
    vertex: { position: [ 0, 0, -2, 0, 0, 2, 8, 0, 2, 8, 0, -2, 0, 4, -2, 0, 4, 2, 8, 4, 2, 8, 4, -2 ] },
    indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6 ] } ]
  } ] }));
  resource.MarkPrepared();
  const area = new Tr2MeshArea();
  area.index = 0;
  area.count = 1;
  area.SetMaterial(material());
  const mesh = new Tr2Mesh();
  mesh.geometryResPath = path;
  mesh.meshIndex = 0;
  mesh.SetGeometryRes(resource);
  mesh.opaquePrepassAreas.push(area);
  const object = new Tr2InteriorStatic();
  object.detailMeshes = [ mesh ];
  return object;
}

test("a fill light sits a character's height above each floor under a ceiling, on the grid", () =>
{
  const pieces = [ { object: roomPiece(), transform: mat4.fromTranslation(mat4.create(), [ 3, 0, 0 ]) } ];
  const sorted = positions => roundPositions(positions).sort((left, right) => left[0] - right[0]);
  assert.deepEqual(sorted(CjsIncarnaEmulator.findFillLightPositions(pieces, { spacing: 4 })), [ [ 0, 1.8, 0 ], [ 4, 1.8, 0 ], [ 8, 1.8, 0 ] ]);
  assert.deepEqual(CjsIncarnaEmulator.findFillLightPositions(pieces, { spacing: 4, headroom: 5 }), [], "a ceiling lower than the headroom is no room");
});
