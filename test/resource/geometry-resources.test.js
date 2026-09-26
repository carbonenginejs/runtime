// The .gr2 geometry route (RegisterGeometryResources). A granny file carries
// no mesh-level bounding box; Carbon's TriGeometryRes::SetupModels builds it
// from the vertices (TriGeometryRes.cpp:1016-1017). A route that read zeros
// gave every mesh a zero-radius sphere, and EveTransform culled it - the
// lens-flare occluder sprites never drew.
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

test("the .gr2 route loads TriGeometryRes and asks the reader to rebuild missing bounds", () =>
{
  const manager = RegisterGeometryResources(RecordingManager());
  assert.equal(manager.extensions.get("gr2"), TriGeometryRes);

  const read = CjsGr2Format.read;
  const loadShared = CjsCmfFormat.loadShared;
  const seen = [];
  CjsGr2Format.read = (bytes, options) => { seen.push(options); return { shared: true }; };
  CjsCmfFormat.loadShared = shared => ({ projected: shared });
  try
  {
    const payload = manager.loaders.get("gr2")(new Uint8Array(4));
    assert.deepEqual(payload, { projected: { shared: true } });
  }
  finally
  {
    CjsGr2Format.read = read;
    CjsCmfFormat.loadShared = loadShared;
  }

  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.rebuildMissingBounds, true);
});
