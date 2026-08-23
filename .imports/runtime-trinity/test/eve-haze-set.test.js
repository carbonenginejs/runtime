import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  EveHazeSet,
  EveHazeSetItem,
  EveHazeSetLight,
  CjsLightData,
  Tr2Effect,
} from "../npm/dist/index.js";


test("EveHazeSet maintains Carbon haze setup without renderer resources", () => {
  const set = new EveHazeSet();
  const effect = new Tr2Effect();
  const item = new EveHazeSetItem();
  set.Setup(effect);
  set.AddHazeItem(item);
  set.SetShaderOption("SPACE_OBJECT_INSTANCED_ATTACHMENT", "SOIA_ENABLED");
  set.AddLightFromSOF({
    lightData: {
      position: [1, 2, 3],
      color: [0.25, 0.5, 0.75, 1],
      radius: 4,
    },
    index: 7,
    lightProfilePath: "res:/lights/haze.lp",
    boosterGainInfluence: true,
  });

  assert.equal(set.effect, effect);
  assert.deepEqual(set.hazes, [item]);
  assert.equal(set.lights.length, 1);
  assert.ok(set.lights[0] instanceof EveHazeSetLight);
  assert.equal(effect.GetOption("SPACE_OBJECT_INSTANCED_ATTACHMENT"), "SOIA_ENABLED");
  assert.equal(set.Initialize(), true);
  assert.doesNotThrow(() => set.Rebuild());
});

test("EveHazeSet exposes authored haze and light state as persisted graph fields", () => {
  const set = new EveHazeSet();
  assert.equal(set.effect, null);
  assert.equal(set.display, true);
  assert.equal(set.name, "");
  assert.deepEqual(set.hazes, []);
  assert.deepEqual(set.lights, []);
  for (const name of ["effect", "display", "name", "hazes", "lights"])
  {
    assert.equal(CjsSchema.getField(EveHazeSet, name)?.io.persist, true, name);
  }
  assert.equal(CjsSchema.getField(EveHazeSet, "lights")?.type.itemType, "EveHazeSetLight");
  assert.equal(CjsSchema.getField(EveHazeSet, "rebuildRevision"), null);
  assert.equal(CjsSchema.getField(EveHazeSetLight, "lightProfilePath")?.type.kind, "string");
  assert.equal(set.Initialize(), true);
});

test("EveHazeSetLight detaches Carbon CjsLightData and profile intent", () => {
  const source = {
    lightData: {
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      color: [4, 5, 6, 7],
      brightness: 2,
      radius: 8,
    },
    index: 9,
    boosterGainInfluence: true,
    lightProfilePath: "res:/lights/haze.lp",
    boneMatrix: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      10, 11, 12, 1,
    ],
  };
  const light = EveHazeSetLight.FromSOF(source);
  assert.ok(light.lightData instanceof CjsLightData);
  assert.deepEqual(Array.from(light.lightData.position), [1, 2, 3]);
  assert.deepEqual(Array.from(light.lightData.color), [4, 5, 6, 7]);
  assert.equal(light.lightData.brightness, 2);
  assert.equal(light.lightData.radius, 8);
  assert.equal(light.index, 9);
  assert.equal(light.boosterGainInfluence, true);
  assert.equal(light.lightProfilePath, "res:/lights/haze.lp");
  assert.deepEqual(Array.from(light.boneMatrix).slice(12, 15), [10, 11, 12]);

  source.lightData.position[0] = 99;
  source.boneMatrix[12] = 99;
  assert.equal(light.lightData.position[0], 1);
  assert.equal(light.boneMatrix[12], 10);
});

test("maintained haze classes replace generated fallbacks", () => {
  for (const className of ["EveHazeSet", "EveHazeSetLight"])
  {
    assert.equal(existsSync(new URL(`../src/generated/eve/attachment/haze/${className}.js`, import.meta.url)), false);
  }
  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry => (
    entry.className === "EveHazeSet" || entry.className === "EveHazeSetLight"
  ));
  assert.deepEqual(skipped.map(entry => entry.className).sort(), ["EveHazeSet", "EveHazeSetLight"]);
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});
