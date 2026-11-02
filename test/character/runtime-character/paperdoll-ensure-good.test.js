// CjsPaperDoll.EnsureGood keeps a hidden character's owned resources through resMan's idle purge.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlueResMan, blue } from "../../../npm/dist/blue/blue/index.js";
import { CjsPaperDoll } from "../../../npm/dist/character/application/CjsPaperDoll.js";
import { CjsPaperDollCompositor } from "../../../npm/dist/character/application/compositor/CjsPaperDollCompositor.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

/** One process-wide manager, restored after every test. */
function managerFor(t)
{
  const previous = blue.resMan;
  const manager = new BlueResMan({ source: { Read: () => "{}" } });
  blue.resMan = manager;
  RegisterDataLoader(manager, "json", value => JSON.parse(value));
  t.after(() => { try { manager.Clear(); } finally { blue.resMan = previous; } });
  return manager;
}

/**
 * A doll owning a compositor whose one effect draws from `texture`, a skeleton and one clip.
 * @returns {Promise<{ doll: CjsPaperDoll, owned: object[] }>}
 */
async function hiddenDoll(manager, name)
{
  const [ texture, skeleton, clip ] = [ "texture", "skeleton", "clip" ].map(kind => manager.GetResource(`res:/${name}/${kind}.json`));
  await Promise.all([ texture, skeleton, clip ].map(resource => manager.Ready(resource)));
  const compositor = new CjsPaperDollCompositor(null, null);
  // Stands in for a Tr2Effect: its EnsureGood renews the texture it draws from.
  compositor.effects.push({ EnsureGood: () => texture.EnsureGood() });
  const doll = new CjsPaperDoll();
  doll.compositors = [ compositor ];
  doll.skeletonResource = skeleton;
  doll.animationResources = new Map([ [ clip.GetPath(), clip ] ]);
  return { doll, owned: [ texture, skeleton, clip ] };
}

test("a hidden doll kept warm with EnsureGood keeps its resources through the idle purge; one left alone expires", async t =>
{
  const manager = managerFor(t);
  const warm = await hiddenDoll(manager, "warm"), cold = await hiddenDoll(manager, "cold");
  manager.activityTime = 1000;
  for (const resource of [ ...warm.owned, ...cold.owned ]) resource.EnsureGood();

  // Whoever hid the warm doll renews it well inside the idle limit; nothing asks for the cold one.
  for (const time of [ 11000, 21000, 31000, 41000 ])
  {
    manager.activityTime = time;
    assert.equal(warm.doll.EnsureGood(), true);
  }
  manager.PurgeInactive({ maxIdleMilliseconds: 30000, time: 45000 });

  for (const resource of warm.owned) assert.equal(manager.GetResourceStatus(resource).purged, false, resource.GetPath());
  for (const resource of cold.owned) assert.equal(manager.GetResourceStatus(resource).purged, true, resource.GetPath());
  assert.equal(cold.doll.compositors[0].EnsureGood(), false, "a purged input revives on use and is not good yet");
});

test("a destructed doll renews nothing it owned", async t =>
{
  const manager = managerFor(t), { doll, owned } = await hiddenDoll(manager, "gone");
  doll.Destruct();
  manager.activityTime = 1000;
  for (const resource of owned) resource.EnsureGood();
  manager.activityTime = 40000;
  assert.equal(doll.EnsureGood(), true, "nothing left to ask");
  manager.PurgeInactive({ maxIdleMilliseconds: 30000, time: 45000 });
  for (const resource of owned) assert.equal(manager.GetResourceStatus(resource).purged, true, resource.GetPath());
});
