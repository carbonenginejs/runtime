// TriGrannyRes: the queries Carbon answers from granny_file_info, answered from the GR2 projection
// (trinity/trinity/Resources/TriGrannyRes.cpp; TriGrannyRes_Blue.cpp). Expected values are written
// from the Carbon source, not from our implementation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TriGrannyRes, Tr2GrannyIntersectionResult } from "../../../npm/dist/resource/index.js";
import { BlueResFileSystemForm, CjsBluePaths, IBlueResFileSystem, CjsBlueResMan, blue } from "../../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../../npm/dist/global/blue/blue.js";
import { CjsGr2Format } from "../../../npm/dist/resource/formats/gr2/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

// Our own generated GR2, made for the racing demo: not a client asset, and the
// only GR2 we have generated that loads correctly (operator, 2026-10-25).
const TRACK = new URL("./fixtures/track.gr2", import.meta.url);

/** A res file system answering from a map of path to bytes. */
function memoryFileSystem(files)
{
  const FileSystem = class extends IBlueResFileSystem
  {
    static protocols = [ "res" ];
    static forms = [ BlueResFileSystemForm.BYTES ];
    FileExists(path) { return files.has(path); }
    IsDirectory() { return false; }
    GetDirectoryContents() {}
    ResolvePathW(path) { return files.has(path) ? path : null; }
    async GetStreamFromPath(path, request)
    {
      return files.has(path) ? { form: request.form, data: files.get(path) } : null;
    }
  };

  return new FileSystem();
}

function withFiles(t, files)
{
  const paths = new CjsBluePaths();
  paths.RegisterFileSystem(memoryFileSystem(files));
  const resMan = new CjsBlueResMan({ source: { async Read(path) { const stream = await paths.GetStreamFromPath(path, {accept: ["bytes"]}); return stream?.data; } } });
  resMan.RegisterFormat(CjsGr2Format, {emit: "json"});
  const previous = installBlueServices({ paths, resMan }, false);
  t.after(() => installBlueServices(previous, previous.running));
}

/** A projected mesh with the channels the queries read; `triangles` is [a, b, c] vertex indices per area. */
function mesh(name, { positions, normals = [], uvs = [], bones = [], areas, morphs = [], bindings = [] })
{
  const all = Uint16Array.from(areas.flat());
  let first = 0;

  return {
    name,
    boneBindings: bindings.map(binding => ({ name: binding })),
    vertex: {
      position: Float32Array.from(positions),
      normal: Float32Array.from(normals),
      texcoord0: Float32Array.from(uvs),
      blendIndice: Float32Array.from(bones),
      tangent: [], binormal: [], texcoord1: [], blendWeight: []
    },
    morphTargets: morphs.map(target => ({ name: target })),
    indexBuffer: all,
    indices: areas.map(triangles =>
    {
      const group = { name: `area_${first}`, bytesPerIndex: 2, firstElement: first / 3, faces: all.subarray(first, first + triangles.length) };
      first += triangles.length;
      return group;
    })
  };
}

/** Two meshes, one model and three animations: more animations than models, which shows the model-count defect. */
function payload()
{
  return {
    grannyFileFormatRevision: 7,
    grannyFileSource: "",
    meshes: [
      mesh("hull", {
        // Triangle A at z = 0, triangle B at z = -2 (area 1), both over (0..1, 0..1).
        positions: [ 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, -2, 1, 0, -2, 0, 1, -2 ],
        normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        uvs: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        bones: [ 3, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0 ],
        areas: [ [ 0, 1, 2 ], [ 3, 4, 5 ] ],
        morphs: [ "Smile01", "FROWN2_left" ],
        bindings: [ "spine", "head" ]
      }),
      mesh("bare", { positions: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ], areas: [ [ 0, 1, 2 ] ] })
    ],
    models: [ { name: "ship", skeleton: { name: "", bones: [] }, meshBindings: Int32Array.of(0, 1) } ],
    animations: [ { name: "idle", duration: 2.5 }, { name: "run", duration: 0.75 }, { name: "jump", duration: 1 } ]
  };
}

function loaded(source = payload())
{
  const resource = new TriGrannyRes();
  // Query fixture: Carbon keeps the decoded file in m_grannyFile.
  resource._grannyFile = source;

  return resource;
}

test("Load reads a GR2 through blue.paths, decodes it and marks the resource good (cpp:173-198)", async t =>
{
  withFiles(t, new Map([ [ "res:/track.gr2", new Uint8Array(readFileSync(TRACK)) ], [ "res:/junk.gr2", new Uint8Array(32) ], [ "res:/a.cmf", new Uint8Array(32) ] ]));

  const resource = new TriGrannyRes();
  const loading = resource.Load("res:/track.gr2");
  assert.ok(loading instanceof Promise);
  assert.equal(await loading, true);
  assert.equal(resource.IsGood(), true);
  assert.equal(resource.GetPath(), "res:/track.gr2");
  assert.equal(resource.GetExt(), "raw", "Load sets the extension to \"raw\" (cpp:175)");
  assert.equal(resource.GetMeshCount(), 1);
  assert.equal(resource.meshCount, 1);
  assert.equal(typeof resource.GetMeshName(0), "string");
  assert.ok(resource.GetMeshTriangleCount(0) > 0);

  const missing = new TriGrannyRes();
  assert.equal(await missing.Load("res:/missing.gr2"), false, "no stream: false (cpp:179-183)");
  assert.equal(missing.IsGood(), false);

  const junk = new TriGrannyRes();
  assert.equal(await junk.Load("res:/junk.gr2"), false, "an undecodable file fails the load");
  assert.equal(junk.IsGood(), false);

  const cmf = new TriGrannyRes();
  assert.equal(await cmf.Load("res:/a.cmf"), false, "Tr2CmfContents is not ported");
  assert.equal(cmf.IsUsingCMF(), true);
});

test("model, mesh and animation counts and names (cpp:959-1007, 1547-1725)", () =>
{
  const resource = loaded();

  assert.equal(resource.GetMeshCount(), 2);
  assert.equal(resource.meshCount, 2);
  assert.equal(resource.GetAnimationCount(), 3);
  assert.equal(resource.animationCount, 3);
  // bug (cpp:974): the Granny branch of GetModelCount returns the ANIMATION count, not the model count.
  assert.equal(resource.GetModelCount(), 3);
  assert.equal(resource.modelCount, 3);
  assert.equal(resource.GetModelName(0), "ship");
  assert.equal(resource.GetModelName(1), "", "an index past the models is logged and answers an empty name");
  assert.equal(resource.GetAnimationName(1), "run");
  assert.equal(resource.GetAnimationName(3), "");
  assert.equal(resource.GetAnimationName(-1), "");
  assert.equal(resource.GetAnimationDuration(0), 2.5);
  assert.equal(resource.GetAnimationDuration(2), 1);
  assert.equal(resource.GetAnimationDuration(9), 0);

  const empty = new TriGrannyRes();
  assert.equal(empty.GetMeshCount(), 0, "no file: ValidateFileInfo logs and the count is 0");
  assert.equal(empty.GetAnimationCount(), 0);
  assert.equal(empty.GetModelCount(), 0);
  assert.equal(empty.GetModelName(0), "");
  assert.equal(empty.GetAnimationDuration(0), 0);
  assert.equal(empty.ValidateFileInfo(), null);
  assert.equal(resource.ValidateFileInfo(), resource.GetGrannyFile());
});

test("mesh queries answer the output and throw Carbon's result messages (cpp:1024-1404)", () =>
{
  const resource = loaded();

  assert.equal(resource.GetMeshName(0), "hull");
  assert.equal(resource.GetMeshName(1), "bare");
  assert.equal(resource.GetMeshAreaCount(0), 2);
  assert.equal(resource.GetMeshTriangleCount(0), 2);
  assert.equal(resource.GetMeshTriangleCount(1), 1);
  assert.deepEqual(resource.GetMeshBoneBindings(0), [ "spine", "head" ]);
  assert.deepEqual(resource.GetMeshBoneBindings(1), []);
  assert.equal(resource.GetMeshMorphCount(0), 2);
  assert.equal(resource.GetMeshMorphCount(1), 0);
  assert.equal(resource.GetMeshMorphName(0, 1), "FROWN2_left");
  assert.deepEqual(resource.GetAllMeshMorphNamesNoDigits(0), [ "smile", "frown_left" ]);

  assert.throws(() => resource.GetMeshName(2), /^Error: Mesh index out of range$/u);
  assert.throws(() => resource.GetMeshAreaCount(-1), /Mesh index out of range/u);
  assert.throws(() => resource.GetMeshMorphName(0, 2), /Morph target index out of range/u);
  assert.throws(() => new TriGrannyRes().GetMeshName(0), /Tried to get file info on an invalid Granny file/u);
});

test("GetAllMeshMorphNamesNoDigits keeps at most 1023 characters (cpp:1361-1378)", () =>
{
  const source = payload();
  source.meshes[0].morphTargets = [ { name: `A1${"b2".repeat(1100)}` }, { name: "9876" } ];
  const names = loaded(source).GetAllMeshMorphNamesNoDigits(0);

  assert.equal(names[0].length, 1023);
  assert.equal(names[0], `a${"b".repeat(1022)}`);
  assert.equal(names[1], "");
});

test("RayIntersection finds the nearest triangle and interpolates the channels (cpp:1966-2081)", () =>
{
  const resource = loaded();
  const hit = resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], -1, -1);

  assert.ok(hit instanceof Tr2GrannyIntersectionResult);
  assert.equal(hit.meshIndex, 0);
  assert.equal(hit.areaIndex, 0, "the nearer triangle is in area 0");
  assert.deepEqual([ ...hit.position ], [ 0.25, 0.25, 0 ]);
  assert.equal(hit.hasPosition, true);
  assert.deepEqual([ ...hit.normal ], [ 0, 0, 1 ]);
  assert.equal(hit.hasNormal, true);
  assert.deepEqual([ ...hit.uv ], [ 0.25, 0.25 ]);
  assert.equal(hit.hasUv, true);
  assert.equal(hit.boneIndex, 3, "the first bone index of the triangle's first vertex");
  assert.equal(hit.hasBoneIndex, true);

  const second = resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], 0, 1);
  assert.equal(second.areaIndex, 1);
  assert.equal(second.position[2], -2);
  assert.equal(second.boneIndex, 6);

  const behind = resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, 1 ], -1, -1);
  assert.equal(behind, null, "t < 0 is a miss");
  assert.equal(resource.RayIntersection([ 5, 5, 5 ], [ 0, 0, -1 ], -1, -1), null);
  assert.equal(resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], 2, -1), null, "mesh index too high");
  assert.equal(resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], -1, 0), null, "an area needs a mesh");
  assert.equal(resource.RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], 0, 2), null, "area index too high");
  assert.equal(new TriGrannyRes().RayIntersection([ 0, 0, 5 ], [ 0, 0, -1 ], -1, -1), null);
});

test("a hit on a mesh without normals, texture coordinates or bone indices says so (cpp:1990-2030)", () =>
{
  const hit = loaded().RayIntersection([ 0.25, 0.25, 5 ], [ 0, 0, -1 ], 1, -1);

  assert.equal(hit.meshIndex, 1);
  assert.equal(hit.hasNormal, false);
  assert.deepEqual([ ...hit.normal ], [ 0, 0, 0 ]);
  assert.equal(hit.hasUv, false);
  assert.equal(hit.hasBoneIndex, false);
  assert.equal(hit.boneIndex, -1);
});

test("RayIntersection against the real track.gr2 hits a triangle through its centroid", () =>
{
  const real = new TriGrannyRes();
  real._grannyFile = CjsGr2Format.read(new Uint8Array(readFileSync(TRACK)), { emit: "json" });

  const track = real.GetGrannyFile().meshes[0];
  const width = track.vertex.position.length / (track.vertexCount ?? track.vertex.position.length / 3);
  const [ a, b, c ] = track.indexBuffer;
  const p = index => [ 0, 1, 2 ].map(k => track.vertex.position[index * width + k]);
  const [ pa, pb, pc ] = [ p(a), p(b), p(c) ];
  const centroid = [ 0, 1, 2 ].map(k => (pa[k] + pb[k] + pc[k]) / 3);
  const normal = [
    (pb[1] - pa[1]) * (pc[2] - pa[2]) - (pb[2] - pa[2]) * (pc[1] - pa[1]),
    (pb[2] - pa[2]) * (pc[0] - pa[0]) - (pb[0] - pa[0]) * (pc[2] - pa[2]),
    (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])
  ];
  const length = Math.hypot(...normal);
  const origin = centroid.map((value, k) => value + normal[k] / length * 100);
  const direction = normal.map(value => -value / length);

  const hit = real.RayIntersection(origin, direction, 0, -1);

  assert.ok(hit, "a ray 100 units above a triangle's centroid, aimed at it, hits the mesh");
  assert.equal(hit.meshIndex, 0);
});

test("rows and states: Carbon's exposure names and what the projection cannot answer", () =>
{
  const row = (name, field = false) => (field ? CjsSchema.getField(TriGrannyRes, name) : CjsSchema.getMethod(TriGrannyRes, name));

  assert.equal(row("Load").exposure.name, "LoadForTools");
  assert.equal(row("BakeBlendshapeFromScript").exposure.name, "BakeBlendshape");

  for (const name of [ "GetModelName", "GetMeshCount", "GetMeshAreaCount", "GetMeshName", "GetMeshBoneBindings", "GetMeshTriangleCount",
    "GetMeshMorphCount", "GetMeshMorphName", "GetAllMeshMorphNamesNoDigits", "GetAnimationName", "GetAnimationDuration", "RayIntersection" ])
  {
    assert.equal(row(name).exposure.macro, "MAP_METHOD_AND_WRAP", name);
    assert.equal(row(name).impl.status, "adapted", name);
  }

  for (const name of [ "modelCount", "meshCount", "animationCount" ])
  {
    assert.equal(row(name, true).exposure.macro, "MAP_PROPERTY_READONLY", name);
  }

  for (const name of [ "GetGrannySkeleton", "GetGrannyVertexType", "GetVertexSize", "GetVertexComponentOffset", "GetMeshVertexElements",
    "GetTrackGroupCount", "GetTrackGroupName", "GetVectorTrackCount", "GetVectorTrackName", "GetEventTrackCount", "GetEventTrackName",
    "BakeBlendshape__NameToWeight", "BakeBlendshape__Weights" ])
  {
    assert.equal(row(name).impl.status, "notImplemented", name);
    assert.throws(() => new TriGrannyRes()[name](), /is not implemented in CarbonEngineJS/u, name);
  }

  assert.equal(row("GetGrannyFile").impl.status, "adapted");
  assert.equal(loaded().GetGrannyFile().models[0].name, "ship");

  // Ported for character morph baking (CPU blendshape bake into independent geometry).
  for (const name of [ "CreateGeometryRes", "BakeBlendshapeFromScript" ])
  {
    assert.equal(row(name).impl.status, "adapted", name);
  }

  for (const name of [ "GetCMFData", "GetCMFViewData", "GetCMFContents" ])
  {
    assert.equal(row(name).impl.status, "notSupported", name);
    assert.throws(() => new TriGrannyRes()[name](), Error, name);
  }
});


test("a superseded direct tools load cannot finish or close its successor", async t =>
{
  const previous = blue.resMan;
  const pending = [];
  const manager = new CjsBlueResMan({ source: { Read() { return new Promise(resolve => pending.push(resolve)); } } });
  blue.resMan = manager;
  manager.RegisterObjectLoader("gr2", bytes => ({ models: [{ name: String(bytes[0]) }], meshes: [], animations: [] }));
  t.after(() => { manager.Clear(); blue.resMan = previous; });
  const resource = new TriGrannyRes();
  const first = resource.Load("res:/first.gr2");
  while (pending.length < 1) await new Promise(resolve => setImmediate(resolve));
  const second = resource.Load("res:/second.gr2");
  while (pending.length < 2) await new Promise(resolve => setImmediate(resolve));
  const secondAttempt = manager._GetResourceLoad(resource);
  pending[0](new Uint8Array([1]));
  assert.equal(await first, false);
  assert.equal(manager._GetResourceLoad(resource), secondAttempt);
  assert.equal(resource.IsLoading(), true);
  pending[1](new Uint8Array([2]));
  assert.equal(await second, true);
  assert.equal(resource.GetGrannyFile().models[0].name, "2");
  assert.equal(resource.IsGood(), true);
  assert.equal(manager._GetResourceLoad(resource), null);
});
