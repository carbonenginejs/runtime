import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  Tr2Sprite2dRenderJob,
  Tr2SpriteObjectBase,
  Tr2SpriteObjectPickState
} from "../../npm/dist/trinity/index.js";


test("Sprite2D bases start pickable and fail incomplete traversal contracts loudly", () =>
{
  const sprite = new Tr2SpriteObjectBase();
  assert.equal(sprite.pickState, Tr2SpriteObjectPickState.TR2_SPS_ON);
  assert.throws(() => sprite.GatherSprites({}), /must be implemented/);
  assert.throws(() => sprite.PickPoint(0, 0, {}), /must be implemented/);
  assert.equal(CjsSchema.getMethod(Tr2SpriteObjectBase, "GatherSprites")?.impl?.status, "abstract");
  assert.equal(CjsSchema.getMethod(Tr2SpriteObjectBase, "PickPoint")?.impl?.status, "abstract");
});

test("Tr2Sprite2dRenderJob gathers its required render job directly", () =>
{
  const sprite = new Tr2Sprite2dRenderJob();
  const job = { name: "hud" };
  const calls = [];
  const renderer = { RunJob: value => calls.push(value) };

  sprite.GatherSprites(renderer);
  sprite.renderJob = job;
  sprite.display = false;
  sprite.GatherSprites(renderer);
  sprite.display = true;
  sprite.GatherSprites(renderer);

  assert.deepEqual(calls, [job]);
  assert.equal(sprite.GetVertexCount(), 0);
  assert.throws(() => sprite.GatherSprites({}), /RunJob/);
});

test("Tr2Sprite2dRenderJob picking preserves Carbon gates and mask coordinates", () =>
{
  const sprite = new Tr2Sprite2dRenderJob();
  sprite.displayX = 10;
  sprite.displayY = 20;
  sprite.displayWidth = 40;
  sprite.displayHeight = 30;

  const insideCalls = [];
  let inverseCalls = 0;
  const renderer = {
    IsInside(point, topLeft, width, height, radius)
    {
      insideCalls.push([Array.from(point), Array.from(topLeft), width, height, radius]);
      return true;
    },
    InverseTransformPoint(point)
    {
      inverseCalls++;
      assert.deepEqual(Array.from(point), [15, 25]);
      return new Float32Array([5, 6]);
    }
  };

  assert.equal(sprite.PickPoint(15, 25, renderer), sprite);
  assert.equal(inverseCalls, 0);
  assert.deepEqual(insideCalls, [[[15, 25], [10, 20], 40, 30, 0]]);

  const maskCalls = [];
  sprite.pickingMask = {
    SampleMask(point, topLeft, width, height)
    {
      maskCalls.push([Array.from(point), Array.from(topLeft), width, height]);
      return false;
    }
  };
  assert.equal(sprite.PickPoint(15, 25, renderer), null);
  assert.deepEqual(maskCalls, [[[5, 6], [10, 20], 40, 30]]);

  const callsBeforeGates = insideCalls.length;
  sprite.pickState = Tr2SpriteObjectPickState.TR2_SPS_OFF;
  assert.equal(sprite.PickPoint(15, 25, renderer), null);
  sprite.pickState = Tr2SpriteObjectPickState.TR2_SPS_ON;
  sprite.display = false;
  assert.equal(sprite.PickPoint(15, 25, renderer), null);
  assert.equal(insideCalls.length, callsBeforeGates);
});

test("Tr2Sprite2dRenderJob is maintained and generator-protected", () =>
{
  const summary = JSON.parse(readFileSync(
    new URL("../../src/trinity/generated/summary.json", import.meta.url),
    "utf8"
  ));
  const disposition = summary.skipped.find(entry => entry.className === "Tr2Sprite2dRenderJob");

  assert.equal(CjsSchema.getMethod(Tr2Sprite2dRenderJob, "GatherSprites")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2Sprite2dRenderJob, "PickPoint")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2Sprite2dRenderJob, "GetVertexCount")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getField(Tr2Sprite2dRenderJob, "renderJob")?.type?.kind, "objectRef");
  assert.equal(disposition?.reason, "hand-maintained source exists");
  assert.equal(existsSync(new URL(
    "../../src/trinity/generated/sprite2d/Tr2Sprite2dRenderJob.js",
    import.meta.url
  )), false);
});
