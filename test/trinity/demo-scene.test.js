import assert from "node:assert/strict";
import test from "node:test";
import { selectDemoScene, demoSceneLighting } from "../trinityal/webgpu/demo/demoScene.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";

const universe = "res:/dx9/scene/universe/a01_cube.black";

test("demo hangar selection follows SOF category, not the station root build class", () =>
{
  const hull = { category: "hangar", buildClass: 2, geometryResFilePath: "res:/dx9/model/hangar/caldari/CHJita/CHJita.gr2" };
  const path = "res:/dx9/model/hangar/caldari/chjita/chjita_scene.black";
  assert.deepEqual(selectDemoScene(hull, universe, candidate => candidate === path), { interior: true, path });
  assert.deepEqual(selectDemoScene({ ...hull, category: "hangar4k" }, universe, () => true), { interior: true, path });
  assert.deepEqual(selectDemoScene({ ...hull, category: "station" }, universe, () => true), { interior: false, path: universe }, "exterior stations retain the universe scene");
  assert.deepEqual(selectDemoScene(hull, universe, () => false), { interior: true, path: null }, "missing hangar scene must not select an outdoor environment");
  assert.deepEqual(selectDemoScene(null, universe, () => false), { interior: false, path: universe });
});

test("hangars suppress automatic sun additions while explicit viewing overrides remain available", () =>
{
  const defaults = { post: "env_sun_yellow_01a", flare: "yellow" };
  assert.deepEqual(demoSceneLighting({ interior: true }, defaults), { post: "", flare: "off" });
  assert.deepEqual(demoSceneLighting({ interior: false }, defaults), defaults);
  assert.deepEqual(demoSceneLighting({ interior: true }, { ...defaults, explicitPost: true, explicitFlare: true }), defaults);
});

const base = process.env.CJS_NONSHIP_RESOURCE_BASE;
for (const name of ["chjita", "gh1"])
{
  test(name + " selects its real authored hangar scene without adding a sun", { skip: !base }, async () =>
  {
    const metadataResponse = await fetch(base + "/sof/hulls/" + name);
    assert.equal(metadataResponse.status, 200);
    const metadata = await metadataResponse.json();
    const hull = metadata.object ?? metadata;
    assert.equal(hull.category, "hangar");
    const selection = selectDemoScene(hull, universe, () => true);
    const response = await fetch(base + "/resources/" + selection.path.replace(/^res:\/+/u, ""));
    assert.equal(response.status, 200);
    const scene = CjsBlackFormat.read(await response.arrayBuffer(), { emit: "json" }).object;
    assert.equal(scene._type, "EveSpaceScene");
    assert.ok(scene.envMapResPath.toLowerCase().includes(name + "_cube"));
    assert.ok(scene.postprocess, "retain the authored post-processing tree");
    assert.ok(scene.sunDirection, "retain authored directional lighting, independent of sun objects");
    assert.equal(scene.lensflares?.length ?? 0, 0);
    assert.deepEqual(demoSceneLighting(selection, { post: "env_sun_yellow_01a", flare: "yellow" }), { post: "", flare: "off" });
  });
}
