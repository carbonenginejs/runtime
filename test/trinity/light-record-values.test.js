import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { CjsLightData, EveBannerLight, EveHazeSetLight, EvePlaneLight, EveSpotlightLight, EveSpriteLight } from "../../npm/dist/trinity/index.js";
import { clientResources } from "../support/clientResources.js";

// Real client files through BePaths (test/support/clientResources.js).
const client = await clientResources();

const types = { EveBannerLight, EveHazeSetLight, EvePlaneLight, EveSpotlightLight, EveSpriteLight };

test("attachment light factories copy typed embedded storage without inherited model helpers", () =>
{
  const source = new CjsLightData();
  source.position.set([1, 2, 3]);
  source.texturePath = "res:/lights/profile.lp";
  for (const Type of Object.values(types))
  {
    const light = Type.FromSOF({ lightData: source });
    assert.equal(light.lightData.constructor, CjsLightData);
    assert.notEqual(light.lightData, source);
    assert.notEqual(light.lightData.position, source.position);
    assert.deepEqual(Array.from(light.lightData.position), [1, 2, 3]);
    assert.equal(light.lightProfilePath, source.texturePath);
    assert.equal("GetValues" in light, false);
    assert.equal("__state" in light, false);
  }
});

test("real gc3_t1 SOF attachment lights retain authored values through their factories", {
  skip: client.skip ?? false
}, async t =>
{
  const bytes = async path =>
  {
    // The client ships authored .red sources as their .black builds.
    return client.Read(path.replace(/\.red$/u, ".black"));
  };
  const sof = (await new EveSOF().Register({
    lazyData: { source: bytes },
    resources: { getObject: async path =>
    {
      const read = CjsBlackFormat.read(await bytes(path), { emit: "json" });
      return (read.root ?? read).object ?? null;
    } },
    volumetricTrailPath: "res:/dx9/model/ship/booster/volumetrictrail.gr2"
  }));
  await sof.InitializeAsync();
  const values = await sof.BuildValuesFromDNAAsync("gc3_t1:gallentebase:gallente");
  const counts = new Map();
  const visit = value =>
  {
    if (!value || typeof value !== "object") return;
    const Type = types[value._type];
    if (Type)
    {
      const light = Type.FromSOF(value);
      assert.equal(light.lightData.constructor, CjsLightData);
      assert.equal(light.index, value.index ?? 0);
      assert.equal(light.lightData.radius, value.lightData.radius ?? 1);
      assert.deepEqual(Array.from(light.lightData.position), Array.from(new Float32Array(value.lightData.position ?? [0, 0, 0])));
      assert.equal(light.lightProfilePath, value.lightProfilePath ?? value.lightData.texturePath ?? "");
      const broken = new Type();
      CjsSchema.setValuesFromSchema(broken, value);
      assert.notEqual(broken.lightData.constructor, CjsLightData,
        "Negative control: stateless struct assignment loses the constructor-owned light record.");
      counts.set(value._type, (counts.get(value._type) ?? 0) + 1);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(values);
  assert.ok(counts.size > 0, "the real SOF graph must contain attachment lights");
  t.diagnostic(JSON.stringify(Object.fromEntries(counts)));
});
