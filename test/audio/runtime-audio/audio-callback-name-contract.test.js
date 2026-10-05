import test from "node:test";
import assert from "node:assert/strict";
import { AudGameObjResource, AudManager, AudUIPlayer } from "../../../npm/dist/audio/index.js";

test("UI completion captures the posted event name without replacing a missing record", async t =>
{
  const previous = AudGameObjResource.manager;
  t.after(() => { AudGameObjResource.manager = previous; });
  AudGameObjResource.manager = null;
  const player = new AudUIPlayer();
  AudGameObjResource.manager = Object.assign(new AudManager(), { _state: "enabled" });
  const completed = [];
  player.eventSenderCallback = name => completed.push(name);
  player.PostEvent = () => 17;
  player.GetPlayingEvents = () => new Map();
  assert.equal(player.SendEventWithCallback("authored"), 17);
  player.EventFinishedCallback(17);
  await new Promise(resolve => queueMicrotask(resolve));
  assert.deepEqual(completed, [undefined]);
  player.GetPlayingEvents = () => new Map([[17, "prefixed_authored"]]);
  player.SendEventWithCallback("authored");
  player.EventFinishedCallback(17);
  await new Promise(resolve => queueMicrotask(resolve));
  assert.deepEqual(completed, [undefined, "prefixed_authored"]);
});
