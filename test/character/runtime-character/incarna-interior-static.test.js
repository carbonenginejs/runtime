import { prepareResourceFixture } from "../../support/resourceFixtures.js";
import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../../npm/dist/blue/blue/index.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import { CjsBlackReader } from "../../../npm/dist/blue/blue/formats/black/core/CjsBlackReader.js";
import { ITr2Interior, ITr2InteriorDynamic, Tr2HighLevelShader, Tr2InteriorScene, Tr2InteriorStatic, Tr2ShaderFloat4Desc, Tr2ShaderManager, Tr2ShaderMaterial, Tr2ShaderPermuteTag, Tr2ShaderTexDesc } from "../../../npm/dist/character/index.js";
import { Tr2Effect, Tr2FloatParameter, TriTextureParameter } from "../../../npm/dist/trinity/shader/index.js";
import { ITr2Renderable, Tr2Mesh, Tr2MeshArea, Tr2RenderContext_GetMainThreadRenderContext, TriPoolAllocator } from "../../../npm/dist/trinity/index.js";
import { TriRenderBatchAccumulator } from "../../../npm/dist/trinity/core/batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { Tr2RenderContextALStub } from "../../../npm/dist/trinityal/index.js";
import { SharedGeometryBuffer } from "../../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";
import { Tr2Renderer } from "../../../npm/dist/trinity/core/Tr2Renderer.js";
import { StubResMan } from "../../support/stubResMan.js";

// The record shape of a captain's quarters walkway piece in build 1142708
// (res:/graphics/interior/<race>/modular_walkway/<piece>.black), in its file
// order: a Tr2InteriorStatic holding one Tr2Mesh whose prepass area holds a
// Tr2ShaderMaterial with a parameter dictionary.
function walkwayRecord()
{
  const f = new BlackFixture();
  const parameters = concat([ u32(2),
    f.String("OverlayMap"), f.Object(5, "TriTextureParameter", [ [ "name", f.String("OverlayMap") ], [ "resourcePath", f.String("res:/graphics/test/piece_os.dds") ] ]),
    f.String("ShadowTransparency"), f.Object(6, "Tr2FloatParameter", [ [ "name", f.String("ShadowTransparency") ], [ "value", f32(0.25) ] ]) ]);
  const material = f.Object(4, "Tr2ShaderMaterial", [
    [ "highLevelShaderName", f.String("IncarnaDetailed") ], [ "parameters", parameters ], [ "defaultSituation", f.String("TwoSided SHLighting") ] ]);
  const area = f.Object(3, "Tr2MeshArea", [ [ "name", f.String("Base_Glass_01") ], [ "index", u32(1) ], [ "effect", material ] ]);
  const mesh = f.Object(2, "Tr2Mesh", [
    [ "geometryResPath", f.String("res:/graphics/test/piece.gr2") ], [ "name", f.String("Piece_MeshShape") ], [ "meshIndex", u32(1) ],
    [ "opaquePrepassAreas", concat([ u32(1), area ]) ] ]);
  return f.Finish(f.Object(1, "Tr2InteriorStatic", [
    [ "name", f.String("Walkway_Test") ], [ "detailMeshes", concat([ u32(1), mesh ]) ], [ "geometryResPath", f.String("res:/graphics/test/piece.gr2") ] ]));
}

test("a walkway record hydrates the Incarna static and its shader material in file order", t =>
{
  renderSetup(t);
  const reader = new CjsBlackReader(walkwayRecord(), { schema: null, initialize: false });
  const root = reader.ReadRuntime().root;

  assert.equal(root.constructor, Tr2InteriorStatic);
  assert.equal(root.name, "Walkway_Test");
  assert.equal(root.geometryResPath, "res:/graphics/test/piece.gr2");
  assert.equal(root.detailMeshes.length, 1);

  const mesh = root.detailMeshes[0];
  assert.equal(mesh.constructor, Tr2Mesh);
  assert.equal(mesh.GetMeshIndex(), 1);
  assert.equal(mesh.opaquePrepassAreas.length, 1);

  const material = mesh.opaquePrepassAreas[0].effect;
  assert.equal(material.constructor, Tr2ShaderMaterial);
  assert.equal(material.highLevelShaderName, "IncarnaDetailed");
  assert.equal(material.defaultSituation, "TwoSided SHLighting");
  assert.deepEqual([ ...material.parameters.keys() ], [ "OverlayMap", "ShadowTransparency" ]);
  assert.equal(material.parameters.get("OverlayMap").resourcePath, "res:/graphics/test/piece_os.dds");
  assert.equal(material.parameters.get("ShadowTransparency").value, 0.25);
  assert.equal(material.IsGood(), false, "read without initializing, the material stays, and a material never draws");
  assert.deepEqual(reader.reports, []);
});

test("the static passes the interior scene's interface checks and joins its dynamics", t =>
{
  const { scene } = renderSetup(t), value = staticWith([ mesh(0) ]);

  assert.equal(blue.classes.QueryThisInterface(value, ITr2InteriorDynamic, Tr2InteriorStatic), value);
  assert.equal(CjsSchema.cast(value, ITr2Interior), value);
  assert.equal(CjsSchema.cast(value, ITr2Renderable), value);

  const s = scene();
  s.AddDynamic(value);
  assert.equal(s.dynamics.FindKey(value) !== -1, true);
  assert.equal(s._dynamicsPendingLoad.includes(value), false, "bounds are ready, so the static is not left pending");
});

test("an opaque request also draws the prepass areas, and only the opaque request does", t =>
{
  const { material } = renderSetup(t), piece = mesh(0), value = staticWith([ piece ]);
  const prepass = area(material), opaque = area(material), held = area(new Tr2ShaderMaterial());
  piece.opaquePrepassAreas.push(prepass, held);
  piece.opaqueAreas.push(opaque);

  const opaqueBatches = batchesOf(value, TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.equal(opaqueBatches.length, 2, "the opaque area and the prepass area; the area still holding Tr2ShaderMaterial is skipped");
  assert.equal(batchesOf(value, TriBatchType.TRIBATCHTYPE_OPAQUE_PREPASS).length, 1, "a direct prepass request is not doubled");
  assert.equal(batchesOf(value, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 0);
});

test("bounds and per-object data follow the static's own transform", t =>
{
  renderSetup(t);
  const value = staticWith([ mesh(0), mesh(10) ]);
  mat4.fromRotationTranslation(value.transform, [ 0, 0, Math.SQRT1_2, Math.SQRT1_2 ], [ 100, 0, 0 ]);

  const min = [ 0, 0, 0 ], max = [ 0, 0, 0 ];
  assert.equal(value.GetLocalBoundingBox(min, max), true);
  assert.deepEqual([ ...min, ...max ], [ 0, -1, -1, 12, 1, 1 ]);
  assert.equal(value.GetWorldBoundingBox(min, max), true);
  assertClose([ ...min, ...max ], [ 99, 0, -1, 101, 12, 1 ]);

  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(new TriPoolAllocator().RegisterCatalog());
  const data = value.GetPerObjectDataWithPerInstanceLighting(accumulator, null, value.transform);
  const transposed = mat4.transpose(mat4.create(), value.transform);
  assertClose(Array.from(data.vs.Get("WorldMat")), Array.from(transposed));
  assert.equal(data.vs.Get("WorldMat")[1], transposed[1], "a basis element, not only the translation, is transposed");
});

// The record shape of build 1142708's res:/graphics/shaders/shaderdescriptions.black,
// in its file order: a Tr2ShaderManager whose library holds Tr2HighLevelShaders,
// each with permutation tags and parameter descriptions.
function shaderLibraryRecord()
{
  const f = new BlackFixture();
  const tag = f.Object(3, "Tr2ShaderPermuteTag", [
    [ "name", f.String("ReflectionGlow") ], [ "permuteDefineString", f.String("OPT_REFLECTION_GLOW") ], [ "tagBits", u32(0x400) ],
    [ "unused", f.String("OPT_GENERATE_ALBEDO") ], [ "predicate", f.String("not OPT_DYNAMIC_OBJECT") ], [ "precompileHint", u32(1) ] ]);
  const texture = f.Object(4, "Tr2ShaderTexDesc", [
    [ "defaultTexture", f.String("res:/texture/global/white.dds") ], [ "parameterName", f.String("DetailDiffuseMap") ],
    [ "name", f.String("DetailDiffuseMap") ], [ "helpText", f.String("High frequency Tiling Detail") ], [ "section", f.String("Base Maps") ] ]);
  const color = f.Object(5, "Tr2ShaderFloat4Desc", [
    [ "defaultValue", concat([ f32(1), f32(0.5), f32(0.25), f32(1) ]) ], [ "isColor", Uint8Array.of(1) ],
    [ "parameterName", f.String("MaterialDiffuseColor") ], [ "name", f.String("Diffuse Color") ],
    [ "helpText", f.String("Diffuse color multiplied against base diffuse") ], [ "section", f.String("Diffuse") ] ]);
  const shader = f.Object(2, "Tr2HighLevelShader", [
    [ "name", f.String("IncarnaSimple_Shadow") ], [ "shaderPath", f.String("res:/graphics/shaders/IncarnaDetailed_Shadow.fx") ],
    [ "permuteTags", concat([ u32(1), tag ]) ], [ "renderClass", f.String("shadow") ],
    [ "parameterDescriptions", concat([ u32(2), texture, color ]) ] ]);
  return f.Finish(f.Object(1, "Tr2ShaderManager", [ [ "shaderLibrary", concat([ u32(1), shader ]) ] ]));
}

test("a shader library record hydrates the Incarna shader classes in file order", t =>
{
  renderSetup(t);
  const reader = new CjsBlackReader(shaderLibraryRecord(), { schema: null, initialize: false });
  const root = reader.ReadRuntime().root;

  assert.equal(root.constructor, Tr2ShaderManager);
  const [ shader ] = root.shaderLibrary;
  assert.equal(shader.constructor, Tr2HighLevelShader);
  assert.equal(shader.name, "IncarnaSimple_Shadow");
  assert.equal(shader.shaderPath, "res:/graphics/shaders/IncarnaDetailed_Shadow.fx");
  assert.equal(shader.renderClass, "shadow");

  const [ tag ] = shader.permuteTags;
  assert.equal(tag.constructor, Tr2ShaderPermuteTag);
  assert.deepEqual([ tag.name, tag.permuteDefineString, tag.tagBits, tag.unused, tag.predicate, tag.precompileHint ],
    [ "ReflectionGlow", "OPT_REFLECTION_GLOW", 0x400, "OPT_GENERATE_ALBEDO", "not OPT_DYNAMIC_OBJECT", 1 ]);

  const [ texture, color ] = shader.parameterDescriptions;
  assert.equal(texture.constructor, Tr2ShaderTexDesc);
  assert.equal(texture.defaultTexture, "res:/texture/global/white.dds");
  assert.equal(texture.parameterName, "DetailDiffuseMap");
  assert.equal(color.constructor, Tr2ShaderFloat4Desc);
  assert.deepEqual(Array.from(color.defaultValue), [ 1, 0.5, 0.25, 1 ]);
  assert.equal(color.isColor, true);
  assert.deepEqual(reader.reports, []);
});

test("a material becomes a Tr2Effect holding its parameters, with its path from the shader's source", async t =>
{
  renderSetup(t);
  blue.resMan = new LibraryResMan(libraryNaming("IncarnaSimple_Shadow", "res:/graphics/shaders/IncarnaDetailed_Shadow.fx"));
  const material = new Tr2ShaderMaterial();
  material.highLevelShaderName = "IncarnaSimple_Shadow";
  const overlay = new TriTextureParameter(); overlay.name = "OverlayMap"; overlay.resourcePath = "res:/graphics/test/piece_os.dds";
  const intensity = new Tr2FloatParameter(); intensity.name = "MaterialDiffuseIntensity"; intensity.value = 0.5;
  material.parameters.set("OverlayMap", overlay).set("MaterialDiffuseIntensity", intensity);

  const effect = material.CreateEffect();
  assert.equal(effect.constructor, Tr2Effect);
  assert.equal(effect.name, "IncarnaSimple_Shadow");
  assert.deepEqual([ ...effect.resources ], [ overlay ], "textures go to resources");
  assert.deepEqual([ ...effect.parameters ], [ intensity ], "constants go to parameters");
  assert.equal(material.parameters.size, 0, "the parameters moved, so the material is spent");

  await settled();
  // The source names the file, not the material's name: no shader uses
  // incarnasimple_shadow.fxt.
  assert.equal(effect.GetEffectPathName(), "res:/graphics/shaders/compiled/dx11/incarnadetailed_shadow.fxt");
  assert.equal(Tr2ShaderMaterial.compiledEffectPath("res:/graphics/shaders/Visualizers/LightPrePassNormals.fx"),
    "res:/graphics/shaders/compiled/dx11/lightprepassnormals.fxt", "the source's folder is dropped");
});

test("initializing a read static puts in each area the effect its material becomes", async t =>
{
  renderSetup(t);
  blue.resMan = new LibraryResMan(libraryNaming("IncarnaDetailed", "res:/graphics/shaders/IncarnaDetailed.fx"));
  const root = new CjsBlackReader(walkwayRecord(), { schema: null }).ReadRuntime().root;

  const effect = root.detailMeshes[0].opaquePrepassAreas[0].effect;
  assert.equal(effect.constructor, Tr2Effect);
  assert.deepEqual([ ...effect.resources ].map(parameter => parameter.name), [ "OverlayMap" ]);
  assert.deepEqual([ ...effect.parameters ].map(parameter => parameter.name), [ "ShadowTransparency" ]);
  await settled();
  assert.equal(effect.GetEffectPathName(), "res:/graphics/shaders/compiled/dx11/incarnadetailed.fxt");
});

test("once the shader library is loaded, a read static's effects hold their paths at once", async t =>
{
  renderSetup(t);
  blue.resMan = new LibraryResMan(libraryNaming("IncarnaDetailed", "res:/graphics/shaders/IncarnaDetailed.fx"));
  const library = await Tr2ShaderMaterial.loadShaderLibrary(blue.resMan);
  assert.equal(await Tr2ShaderMaterial.loadShaderLibrary(blue.resMan), library, "loaded once per manager");

  const root = new CjsBlackReader(walkwayRecord(), { schema: null }).ReadRuntime().root;
  const effect = root.detailMeshes[0].opaquePrepassAreas[0].effect;
  assert.equal(effect.GetEffectPathName(), "res:/graphics/shaders/compiled/dx11/incarnadetailed.fxt");
  assert.equal(blue.resMan.requests.filter(request => request.path === Tr2ShaderMaterial.shaderLibraryPath).length, 1);
});

/** A test manager whose LoadObject answers with a shader library. */
class LibraryResMan extends StubResMan
{
  constructor(library)
  {
    super();
    this.library = library;
  }

  LoadObject(path)
  {
    this.requests.push({ path, load: true });
    return Promise.resolve(path === Tr2ShaderMaterial.shaderLibraryPath ? this.library : null);
  }
}

function libraryNaming(name, shaderPath)
{
  const shader = new Tr2HighLevelShader();
  shader.name = name;
  shader.shaderPath = shaderPath;
  const library = new Tr2ShaderManager();
  library.shaderLibrary = [ shader ];
  return library;
}

function settled()
{
  return new Promise(resolve => setImmediate(resolve));
}

function renderSetup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), oldAL = context.GetRenderContextAL(), oldManager = blue.resMan;
  const oldView = Tr2Renderer.GetViewTransform().slice();
  const al = new Tr2RenderContextALStub(); al.CreateDevice(); al.BeginScene(); context.SetRenderContextAL(al);
  blue.resMan = new StubResMan(); Tr2Renderer.SetViewTransform(mat4.create());
  const scenes = [];
  t.after(() =>
  {
    for (const scene of scenes) scene.Destruct();
    SharedGeometryBuffer(context).ReleaseResources(); context.SetRenderContextAL(oldAL); blue.resMan = oldManager;
    Tr2Renderer.SetViewTransform(oldView); al.Destroy();
  });
  const shader = { GetTechniqueIndex: () => 0, GetPassCount: () => 1, GetShaderTypeMask: () => 3, ApplyAllStateForPass() {} };
  const material = { GetShaderStateInterface: () => shader, IsGood: () => true, ApplyMaterialDataForPass() {} };
  return { context, material, scene: () => { const scene = new Tr2InteriorScene(); scenes.push(scene); return scene; } };
}

function staticWith(meshes)
{
  const value = new Tr2InteriorStatic();
  value.detailMeshes = meshes;
  return value;
}

function mesh(x)
{
  const resource = new TriGeometryRes();
  resource.ReadCMFFile({ meshes: [ {
    bounds: { min: [ x, -1, -1 ], max: [ x + 2, 1, 1 ] },
    decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
    vertex: { position: [ x, 0, 0, x + 2, 0, 0, x, 1, 0 ] },
    indices: [ { faces: [ 0, 1, 2 ] } ], areas: [ { firstElement: 0, elementCount: 1 } ]
  } ] });
  prepareResourceFixture(resource);
  const value = new Tr2Mesh();
  value.SetGeometryRes(resource);
  return value;
}

function area(material)
{
  const value = new Tr2MeshArea();
  value.SetMaterial(material);
  return value;
}

function batchesOf(value, type)
{
  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(new TriPoolAllocator().RegisterCatalog());
  const committed = [];
  const commit = accumulator.Commit.bind(accumulator);
  accumulator.Commit = batch => { committed.push(batch); return commit(batch); };
  value.GetBatches(accumulator, type, value.GetPerObjectData(accumulator));
  return committed;
}

function assertClose(actual, expected)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5, `element ${i}: ${actual[i]} vs ${expected[i]}`);
}

class BlackFixture
{
  strings = [];
  String(value)
  {
    let index = this.strings.indexOf(value);
    if (index === -1) { index = this.strings.length; this.strings.push(value); }
    return u16(index);
  }
  Object(id, kind, fields)
  {
    const parts = [ this.String(kind) ];
    for (const [ name, value ] of fields) parts.push(concat([ this.String(name), value ]));
    const body = concat(parts);
    return concat([ u32(id), u32(body.length), body ]);
  }
  Finish(root)
  {
    const narrow = [ u16(this.strings.length) ];
    for (const value of this.strings) narrow.push(concat([ new TextEncoder().encode(value), new Uint8Array(1) ]));
    const strings = concat(narrow), wide = u16(0);
    return concat([ u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wide.length), wide, root ]);
  }
}

function concat(parts)
{
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

function u16(value)
{
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value)
{
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function f32(value)
{
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return bytes;
}
