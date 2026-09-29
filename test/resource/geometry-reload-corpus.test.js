import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import test from "node:test";
import {CjsResMan, CjsMotherLode} from "../../npm/dist/global/blue/index.js";
import {RegisterGeometryResources} from "../../npm/dist/resource/index.js";
import {Tr2Mesh, Tr2MeshArea, Tr2RenderContext} from "../../npm/dist/trinity/index.js";

const corpus = process.env.GEOMETRY_GR2_CORPUS_DIR;

test("real cf2_t2a survives payload expiry and retained handles reload after release/purge", {
  skip: !corpus && "set GEOMETRY_GR2_CORPUS_DIR for the real police hull lifecycle proof"
}, async t =>
{
  const bytes = await readFile(join(corpus, "cf2_t2a.gr2"));
  assert.equal(bytes.length, 185032);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "89fda62f09cdf0299ed347362460283d4645b66788b5292a276f450935d1897a");
  let time = 0, reads = 0;
  const path = "res:/dx9/model/ship/caldari/frigate/cf2/cf2_t2a.gr2";
  const manager = new CjsResMan({motherLode: new CjsMotherLode({now: () => time}), source: {
    Read(request){assert.equal(request, path); reads++; return bytes;}
  }});
  RegisterGeometryResources(manager);
  const geometry = manager.GetResource(path);
  await geometry.Ready();
  t.after(() => manager.PurgeInactive({maxIdleFrames: 0, maxIdleMilliseconds: 0}));
  assert.equal(geometry.GetMeshCount(), 7);
  const mesh = new Tr2Mesh(); mesh.SetGeometryRes(geometry);
  const context = new Tr2RenderContext(); const al = context.GetRenderContextAL(); al.CreateDevice(); al.BeginScene();
  const draws = []; const draw = al.DrawIndexedInstanced.bind(al);
  al.DrawIndexedInstanced = (...args) => {draws.push(args); return draw(...args);};
  const area = new Tr2MeshArea(); area.count = 3;
  area.SetMaterial({GetShaderStateInterface: () => ({})});
  function drawHull()
  {
    const before = draws.length;
    for (let i = 0; i < 7; i++)
    {
      mesh.meshIndex = i;
      const batches = [];
      mesh.GetBatches({Commit(batch){batches.push(batch); return true;}}, [area], null);
      assert.equal(batches.length, 1);
      assert.equal(context.SubmitGeometry(batches[0]), true);
    }
    assert.equal(draws.length - before, 7, "all seven decoded meshes reach the stub AL");
    assert.ok(draws.slice(before).every(args => args[0] > 0 && args[1] === 1));
  }
  drawHull();
  const originalLod = geometry.GetMeshLodByIndex(0, 0), originalAllocation = originalLod.vertexAllocation;
  time = 10;
  const sweep = manager.PurgeInactive({time, maxIdleMilliseconds: 100, payloadMaxIdleMilliseconds: 5});
  assert.equal(sweep.payloadsReleased, 0, "TriGeometryRes.cpp:496-509 has no prepared-but-empty geometry tier");
  assert.equal(geometry.IsGood(), true);
  assert.equal(manager.GetResource(path), geometry);
  assert.equal(geometry.GetMeshCount(), 7);
  drawHull();
  assert.equal(reads, 1, "payload-only sweep retains the usable canonical geometry");
  assert.equal(originalAllocation.IsValid(), true);

  geometry.ReleaseResources();
  assert.equal(geometry.IsPrepared(), false, "TriGeometryRes.cpp:507-508 invalidates released geometry");
  assert.equal(geometry.HasPayload(), false);
  assert.equal(originalAllocation.IsValid(), false);
  assert.equal(mesh.GetGeometryResource(), geometry, "Tr2Mesh.cpp:213-219 checks primary IsGood even without a low-res fallback");
  assert.equal(geometry.IsLoading(), true, "ordinary mesh reuse must start reload without an explicit Ready call");
  await settle(geometry);
  assert.equal(reads, 2);
  assert.equal(manager.Lookup(path), geometry);
  drawHull();

  const sweep2 = manager.PurgeInactive({maxIdleFrames: 0, maxIdleMilliseconds: 0});
  assert.equal(sweep2.purged, 1);
  assert.equal(geometry.IsPurged(), true);
  assert.equal(geometry.IsGood(), false, "purged retained handle starts recovery without throwing from Reload");
  await settle(geometry);
  assert.equal(reads, 3);
  assert.equal(manager.Lookup(path), geometry);
  drawHull();
  t.diagnostic("cf2_t2a: seven meshes drawn on initial load, after payload-only sweep, after ReleaseResources, and after full purge; three source reads");
});

async function settle(resource)
{
  // Allow the manager's asynchronous load queue to complete under a full
  // corpus run; 200 empty event-loop turns can finish before its timer fires.
  const deadline = Date.now() + 5000;
  while (!resource.IsPrepared() && !resource.IsFailed() && Date.now() < deadline)
    await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(resource.IsPrepared(), true, "automatic recovery completes into the same retained resource");
}
