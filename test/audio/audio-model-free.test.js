import assert from "node:assert/strict";
import test from "node:test";
import { AudGeometry, AudPosition, AudStaticDataRepository, ITr2AudGeometry } from "../../npm/dist/audio/index.js";
import { IBluePlacementObserver, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

test("audio geometry and position retain native nominal interfaces without model helpers", () =>
{
  const geometry = new AudGeometry();
  assert.equal(CjsSchema.cast(geometry, ITr2AudGeometry), geometry);
  assert.equal(CjsSchema.cast({ SetGeometry() {}, SetGeometryTransform() {}, RemoveGeometry() {} }, ITr2AudGeometry), null);
  assert.deepEqual([...mappedInterfaces(AudGeometry)], [ITr2AudGeometry]);
  const position = new AudPosition();
  assert.equal(CjsSchema.cast(position, IBluePlacementObserver), position);
  assert.equal(mappedInterfaces(AudPosition).has(INotify), false);
  assert.equal(mappedInterfaces(AudPosition).has(IInitialize), false);
  position.UpdatePlacement([1, 0, 0], [0, 1, 0], [4, 5, 6]);
  assert.deepEqual(Array.from(position.value.position), [4, 5, 6]);
  for (const value of [geometry, position, new AudStaticDataRepository()])
  {
    assert.equal("GetValues" in value, false);
    assert.equal("SetValues" in value, false);
    assert.equal("__state" in value, false);
  }
});

test("audio metadata initialization remains an explicit catalog operation", () =>
{
  assert.equal(mappedInterfaces(AudStaticDataRepository).has(IInitialize), false);
  const catalog = new AudStaticDataRepository();
  assert.equal(catalog._initialized, false);
  catalog.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  assert.equal(catalog._initialized, true);
});
