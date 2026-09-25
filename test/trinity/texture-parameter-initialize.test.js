import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../npm/dist/global/blue/index.js";
import { ResourceRequirement } from "../../npm/dist/resource/index.js";
import { TriTextureParameter } from "../../npm/dist/trinity/index.js";
import { composeStubResMan } from "../support/stubResMan.js";

// Carbon TriTextureParameter::Initialize (TriTextureParameter.cpp:198-240):
// a path change fetches the texture through BeResMan, and a missing authored
// file with a local `_lowdetail` sibling renders the sibling until the
// authored resource is ready (GetResource, cpp:271-290).

/** Runs with a stub manager and a paths predicate answering from `local`. */
function withManager(local, run)
{
  const stub = composeStubResMan();
  blue.paths.SetResourceFileIndex(path => local.has(path));
  try
  {
    return run(stub);
  }
  finally
  {
    stub.restore();
    blue.paths.SetResourceFileIndex(path =>
    {
      const resource = blue.resMan.Lookup(path);
      return resource !== null && resource.HasPayload();
    });
  }
}

test("a path change fetches the texture through the resource manager", () =>
{
  withManager(new Set(), stub =>
  {
    const parameter = new TriTextureParameter();
    parameter.SetResourcePath("res:/texture/a.dds");

    assert.deepEqual(stub.requests.map(r => r.path), [ "res:/texture/a.dds" ]);
    assert.equal(stub.requests[0].options.requirement, ResourceRequirement.TEXTURE);
    assert.equal(parameter.GetResource(), stub.resources.get("res:/texture/a.dds"));
  });
});

test("an empty path fetches nothing", () =>
{
  withManager(new Set(), stub =>
  {
    const parameter = new TriTextureParameter();
    parameter.Initialize();

    assert.equal(stub.requests.length, 0);
    assert.equal(parameter.GetResource(), null);
  });
});

test("a local low-detail sibling renders until the authored texture is prepared", () =>
{
  withManager(new Set([ "res:/texture/a_lowdetail.dds" ]), stub =>
  {
    const parameter = new TriTextureParameter();
    parameter.SetResourcePath("res:/texture/a.dds");

    assert.deepEqual(stub.requests.map(r => r.path), [ "res:/texture/a_lowdetail.dds", "res:/texture/a.dds" ]);
    const lowRes = stub.resources.get("res:/texture/a_lowdetail.dds");
    const authored = stub.resources.get("res:/texture/a.dds");
    assert.equal(parameter.GetResource(), lowRes);

    authored.MarkPrepared();
    assert.equal(parameter.GetResource(), authored);
  });
});

test("no sibling is fetched when the authored texture is local", () =>
{
  withManager(new Set([ "res:/texture/a.dds", "res:/texture/a_lowdetail.dds" ]), stub =>
  {
    const parameter = new TriTextureParameter();
    parameter.SetResourcePath("res:/texture/a.dds");

    assert.deepEqual(stub.requests.map(r => r.path), [ "res:/texture/a.dds" ]);
  });
});
