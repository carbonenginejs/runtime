// The .gr2 geometry route (RegisterGeometryResources) and the reader it hands
// the bytes to, TriGeometryRes.ReadGrannyFile.
//
// A granny file carries no mesh-level bounding box; Carbon's
// TriGeometryRes::SetupModels builds it from the vertices
// (TriGeometryRes.cpp:1016-1017). A route that read zeros gave every mesh a
// zero-radius sphere, and EveTransform culled it - the lens-flare occluder
// sprites never drew.
//
// Carbon decides CMF by the reader that ran, not by payload shape: ReadGrannyFile
// clears m_useCMF and keeps m_pGrannyFile (cpp:1245-1276), which GetGrannyInfo
// answers from (cpp:242-252). Every payload here is CMF-shaped, a granny one
// included, so a shape test called every hull CMF.
import assert from "node:assert/strict";
import test from "node:test";

import { RegisterGeometryResources, TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { CjsCmfFormat } from "../../npm/dist/resource/formats/cmf/index.js";

function RecordingManager()
{
  const loaders = new Map();
  const extensions = new Map();
  return {
    loaders,
    extensions,
    RegisterObjectLoader: (extension, loader) => loaders.set(extension, loader),
    RegisterExtension: (extension, type) => extensions.set(extension, type)
  };
}

/** Replaces the two format readers for the body; the granny read is `{ granny: true }`. */
function WithStubbedReaders(t)
{
  const read = CjsGr2Format.read;
  const loadShared = CjsCmfFormat.loadShared;
  const cmfRead = CjsCmfFormat.read;
  const seen = [];
  CjsGr2Format.read = (bytes, options) => { seen.push(options); return { granny: true }; };
  CjsCmfFormat.loadShared = shared => ({ meshes: [], projected: shared });
  CjsCmfFormat.read = () => ({ meshes: [], cmf: true });
  t.after(() =>
  {
    CjsGr2Format.read = read;
    CjsCmfFormat.loadShared = loadShared;
    CjsCmfFormat.read = cmfRead;
  });
  return seen;
}

test("the .gr2 route loads TriGeometryRes through ReadGrannyFile, rebuilding missing bounds", (t) =>
{
  const seen = WithStubbedReaders(t);
  const manager = RegisterGeometryResources(RecordingManager());
  assert.equal(manager.extensions.get("gr2"), TriGeometryRes);

  const resource = new TriGeometryRes();
  const payload = manager.loaders.get("gr2")(new Uint8Array(4), { resource });

  assert.deepEqual(payload, { meshes: [], projected: { granny: true } });
  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.rebuildMissingBounds, true);
  assert.deepEqual(resource.GetGrannyInfo(), { granny: true }, "the granny read is kept whole");
});

test("IsUsingCMF follows the reader that ran, not the payload's shape", (t) =>
{
  WithStubbedReaders(t);
  const resource = new TriGeometryRes();

  assert.equal(resource.IsUsingCMF(), true, "Carbon's default (cpp:210)");

  resource.SetPayload(resource.ReadGrannyFile(new Uint8Array(4)));
  assert.equal(resource.IsUsingCMF(), false, "a granny file, although its payload is CMF-shaped");
  assert.ok(resource.GetGrannyInfo());

  resource.SetPayload(resource.ReadCMFFile(new Uint8Array(4)));
  assert.equal(resource.IsUsingCMF(), true);
  assert.equal(resource.GetGrannyInfo(), null, "a CMF file has no granny file");
});

test("the granny file goes with its payload: releasing or replacing it forgets the file", (t) =>
{
  WithStubbedReaders(t);
  const resource = new TriGeometryRes();

  resource.SetPayload(resource.ReadGrannyFile(new Uint8Array(4)));
  resource.ReleasePayload();
  assert.equal(resource.GetGrannyInfo(), null);
  assert.equal(resource.IsUsingCMF(), true);

  resource.SetPayload(resource.ReadGrannyFile(new Uint8Array(4)));
  resource.SetPayload({ meshes: [] });
  assert.equal(resource.GetGrannyInfo(), null, "a payload no granny read produced");
  assert.equal(resource.IsUsingCMF(), true);
});
