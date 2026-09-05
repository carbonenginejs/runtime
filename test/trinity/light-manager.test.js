import test from "node:test";
import assert from "node:assert/strict";
import { Tr2LightManager, TriFrustum } from "../../npm/dist/trinity/index.js";
import { CreateLightRecord, LIGHT_FLAG_CASTS_SHADOWS, LIGHT_FLAG_IS_VOLUMETRIC } from "../../npm/dist/trinity/eve/lights/lightConversion.js";

const FLAGS = Tr2LightManager.Flags;

/** Decodes one IEEE binary16 half from its bits, for pack assertions. */
function fromHalf(bits)
{
  const sign = (bits & 0x8000) ? -1 : 1;
  const exponent = (bits >> 10) & 0x1F;
  const mantissa = bits & 0x3FF;
  if (exponent === 0) return sign * mantissa * 2 ** -24;
  if (exponent === 0x1F) return mantissa ? NaN : sign * Infinity;
  return sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}

/** A frustum double extending the real class, per the fixture rule. */
function makeFrustum({ visible = true, pixelSize = 100 } = {})
{
  return new (class extends TriFrustum
  {
    IsSphereVisible()
    {
      return visible;
    }
    GetPixelSizeAccross()
    {
      return pixelSize;
    }
  })();
}

test("AddLight applies Carbon's gates, premultiply, and in-place shadow strip", () =>
{
  const manager = new Tr2LightManager();

  // Invalid flags (neither surfaces nor particles) are rejected first.
  const invalid = CreateLightRecord();
  invalid.flags = 0;
  invalid.color.set([ 1, 1, 1 ]);
  invalid.radius = 10;
  manager.AddLight(invalid);
  assert.equal(manager.GetLightData().length, 0);

  // Zero brightness and zero radius are rejected.
  const dark = CreateLightRecord();
  dark.flags = FLAGS.DEFAULT;
  dark.radius = 10;
  manager.AddLight(dark);
  const flat = CreateLightRecord();
  flat.flags = FLAGS.DEFAULT;
  flat.color.set([ 1, 0, 0 ]);
  manager.AddLight(flat);
  assert.equal(manager.GetLightData().length, 0);

  // With no frustum set, dimming is 1: colour is premultiplied by exactly
  // the radius (contract: a producer omitting the premultiply is dim by a
  // factor of its own radius).
  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT | LIGHT_FLAG_CASTS_SHADOWS;
  record.color.set([ 0.5, 0.25, 1 ]);
  record.radius = 4;
  record.position.set([ 1, 2, 3 ]);
  manager.AddLight(record);

  // The caller's scratch record is mutated in place, as Carbon's non-const
  // reference is: the shadow flag is stripped under the shipping pin.
  assert.equal(record.flags & LIGHT_FLAG_CASTS_SHADOWS, 0);

  const stored = manager.GetLightData()[0];
  assert.notEqual(stored, record, "the manager copies; producers reuse scratch records");
  assert.deepEqual(Array.from(stored.color), [ 2, 1, 4 ]);
  record.position.set([ 9, 9, 9 ]);
  assert.deepEqual(Array.from(stored.position), [ 1, 2, 3 ], "deep copy, not aliased");
});

test("the frustum cull, cutoff, and fade band follow the contract", () =>
{
  const manager = new Tr2LightManager();
  manager.AdjustLightCutoff(1); // adjustedCutoff = 7

  manager.SetFrustum(makeFrustum({ visible: false }));
  manager.AddPointLight([ 0, 0, 0 ], 5, [ 1, 1, 1 ]);
  assert.equal(manager.GetLightData().length, 0, "invisible sphere rejected");

  manager.SetFrustum(makeFrustum({ pixelSize: 7 }));
  manager.AddPointLight([ 0, 0, 0 ], 5, [ 1, 1, 1 ]);
  assert.equal(manager.GetLightData().length, 0, "absent AT the cutoff (7px)");

  // The band sits ABOVE the cutoff: 7 + 2.5 = half brightness.
  manager.SetFrustum(makeFrustum({ pixelSize: 9.5 }));
  manager.AddPointLight([ 0, 0, 0 ], 2, [ 1, 0.5, 0 ]);
  const dimmed = manager.GetLightData()[0];
  assert.ok(Math.abs(dimmed.color[0] - 1) < 1e-6, "1 * radius 2 * dimming 0.5");
  assert.deepEqual(Array.from(dimmed.direction), [ 1, 0, 0 ], "point default direction is (1,0,0), never zero");
});

test("ResolveLightData keeps the sixteen largest volumetric lights and clears the losers' flag", () =>
{
  const manager = new Tr2LightManager();
  manager.SetFrustum(makeFrustum({ pixelSize: 100 }));
  manager.AdjustLightCutoff(0);

  const records = [];
  for (let i = 0; i < 17; i++)
  {
    const record = CreateLightRecord();
    record.flags = FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC;
    record.color.set([ 1, 1, 1 ]);
    record.radius = 1 + i;
    manager.AddLight(record);
    records.push(record);
  }
  // Screen size ties (fixed pixelSize), so the sort is stable by insertion:
  // the seventeenth entry loses.
  const before = manager.GetDataRevision();
  manager.ResolveLightData();
  assert.equal(manager.GetDataRevision(), before + 1);
  assert.equal(manager.GetVolumetricLights().length, 16);
  const stored = manager.GetLightData();
  assert.equal(stored[16].flags & LIGHT_FLAG_IS_VOLUMETRIC, 0, "loser flag cleared so shader and CPU agree");
  assert.equal(stored[0].flags & LIGHT_FLAG_IS_VOLUMETRIC, LIGHT_FLAG_IS_VOLUMETRIC);
});

test("the packed buffer carries the contract layout, including biased profile slots", () =>
{
  const manager = new Tr2LightManager();

  const profile = { name: "profile-a" };
  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC;
  record.color.set([ 1, 1, 1 ]);
  record.radius = 2;
  record.position.set([ 10, 20, 30 ]);
  record.direction.set([ 0, 1, 0 ]);
  record.innerRadius = 0.5;
  record.outerAngle = 0.25;
  record.innerAngle = 0.75;
  record.projectionPlaneDistance = 1.25;
  record.lightProfile = profile;
  manager.AddLight(record);

  const second = CreateLightRecord();
  second.flags = FLAGS.DEFAULT;
  second.color.set([ 1, 1, 1 ]);
  second.radius = 1;
  second.lightProfile = profile;
  manager.AddLight(second);

  manager.ResolveLightData();
  assert.equal(manager.GetLightCount(), 2);
  const data = manager.GetLightBufferData();
  assert.equal(data.length, 24, "three RGBA32 texels per light");

  // Texel 0: position + radius.
  assert.deepEqual(Array.from(data.slice(0, 4)), [ 10, 20, 30, 2 ]);

  // Texel 1.w: innerRadius f16 low, flags u16 high with the profile slot
  // biased by one in bits 4-15 (both records share slot 1).
  const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
  assert.ok(Math.abs(fromHalf(bits[7] & 0xFFFF) - 0.5) < 1e-3, "innerRadius half");
  const flagsWord = bits[7] >>> 16;
  assert.equal(flagsWord & 0xF, FLAGS.DEFAULT | LIGHT_FLAG_IS_VOLUMETRIC);
  assert.equal(flagsWord >>> 4, 1, "profile slot 0, stored biased as 1");
  assert.equal((bits[19] >>> 16) >>> 4, 1, "second record shares the slot");

  // Texel 2: direction halves, projection plane distance, angles, zeroed union.
  assert.ok(Math.abs(fromHalf(bits[8] >>> 16) - 1) < 1e-3, "direction.y");
  assert.ok(Math.abs(fromHalf(bits[9] >>> 16) - 1.25) < 1e-3, "projectionPlaneDistance");
  assert.ok(Math.abs(fromHalf(bits[10] & 0xFFFF) - 0.25) < 1e-3, "outerAngle");
  assert.ok(Math.abs(fromHalf(bits[10] >>> 16) - 0.75) < 1e-3, "innerAngle");
  assert.equal(bits[11], 0, "shadow union dead under the shipping pin");
});

test("the frame clock seam and Clear behave", () =>
{
  const manager = new Tr2LightManager();
  assert.equal(manager.GetAnimationTime(), 0);
  manager.SetAnimationTime(2.5);
  assert.equal(manager.GetAnimationTime(), 2.5);

  const record = CreateLightRecord();
  record.flags = FLAGS.DEFAULT;
  record.color.set([ 1, 1, 1 ]);
  record.radius = 1;
  manager.AddLight(record);
  manager.Clear();
  assert.equal(manager.GetLightData().length, 0);
  assert.equal(manager.GetAnimationTime(), 2.5, "Clear drops records, not the clock or frustum state");
});
