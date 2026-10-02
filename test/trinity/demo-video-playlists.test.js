import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsResMan, RegisterVideoPlaylists, ResourceRequirement, TriTextureRes } from "../../npm/dist/resource/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { TriDevice, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";
import { DEMO_VIDEO_PLAYLISTS } from "../trinityal/webgpu/demo/demoVideoPlaylists.js";
import { hydrateDemoShip } from "../trinityal/webgpu/demo/demoShipLifetime.js";

test("demo registers both shared dynamic video textures without starting playback", () =>
{
  const manager = new CjsResMan({ source: { Read() { throw new Error("No video decoding during registration"); } } });
  RegisterVideoPlaylists(manager, DEMO_VIDEO_PLAYLISTS);
  assert.deepEqual(Object.keys(DEMO_VIDEO_PLAYLISTS), ["inspacevideos", "hangarvideos"]);
  for (const name of Object.keys(DEMO_VIDEO_PLAYLISTS))
  {
    const path = "dynamic:/" + name;
    const texture = manager.GetResource(path);
    assert.equal(CjsSchema.cast(texture, TriTextureRes), texture);
    assert.equal(texture.IsGood(), true);
    assert.equal(manager.GetResource(path), texture);
  }
  assert.notEqual(manager.GetResource("dynamic:/inspacevideos"), manager.GetResource("dynamic:/hangarvideos"));
});

const resourceBase = process.env.CJS_NONSHIP_RESOURCE_BASE;
for (const [dna, dynamicName] of [["chjita:caldarinavy:caldari", "hangarvideos"], ["gh1:gallentebase:gallente", "hangarvideos"]])
{
  test("real non-ship hydrates with its dynamic video store: " + dna, { skip: !resourceBase }, async t =>
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const previous = context.GetRenderContextAL(), manager = blue.resMan;
    const registered = new Set(TriDevice.GetResourcesRegistered());
    const al = new Tr2RenderContextALStub();
    al.CreateDevice();
    al.BeginScene();
    context.SetRenderContextAL(al);
    t.after(() =>
    {
      for (const resource of TriDevice.GetResourcesRegistered())
      {
        if (registered.has(resource)) continue;
        resource.ReleaseResources();
        TriDevice.UnregisterResource(resource);
      }
      context.SetRenderContextAL(previous);
      blue.resMan = manager;
      al.Destroy();
    });
    const Read = async path =>
    {
      const logical = path.replace(/^res:\//u, "").replace(/\.red$/u, ".black");
      const response = await fetch(resourceBase + "/resources/" + logical, { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, path);
      return new Uint8Array(await response.arrayBuffer());
    };
    const paths = await (await fetch(resourceBase + "/resfiles")).json();
    const sof = new EveSOF().Register({ lazyData: { source: Read }, resFileIndex: paths,
      resources: { getObject: async path => {
        const read = CjsBlackFormat.read(await Read(path), { emit: "json" });
        return (read.root ?? read).object;
      } }, volumetricTrailPath: "res:/dx9/model/ship/booster/volumetrictrail.gr2" });
    const values = await sof.BuildValuesFromDNAAsync(dna);
    assert.notEqual(values._type, "EveShip2");
    const ordinary = new StubResMan();
    let dynamic = new CjsResMan();
    blue.resMan = new StubResMan((path, options) => path.startsWith("dynamic:/")
      ? dynamic.GetResource(path, options) : ordinary.GetResource(path, options));
    // Negative control reproduces the operator's exact constructor error.
    assert.throws(() => hydrateDemoShip(values), { code: "CJS_RESMAN_DYNAMIC_CONSTRUCTOR_MISSING", path: "dynamic:/" + dynamicName });
    dynamic = new CjsResMan();
    RegisterVideoPlaylists(dynamic, DEMO_VIDEO_PLAYLISTS);
    const root = hydrateDemoShip(values);
    assert.equal(root.constructor.name, values._type);
    let found = 0;
    Traverse(root, object =>
    {
      if (object.resourcePath === "dynamic:/" + dynamicName)
      {
        found++;
        assert.equal(object.GetResource(), dynamic.GetResource(object.resourcePath, { requirement: ResourceRequirement.TEXTURE }));
        assert.equal(object.GetResource().IsGood(), true);
      }
    });
    assert.ok(ordinary.requests.length > 0, "ordinary resources remain deferred in this CPU-only test");
    assert.ok(found > 0, "real graph contains the requested video texture");
    assert.equal(dynamic.GetResource("dynamic:/" + dynamicName).IsGood(), true);
    t.diagnostic(dna + ": " + root.constructor.name + ", " + found + " dynamic video parameters hydrated");
  });
}
