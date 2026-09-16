import assert from "node:assert/strict";
import test from "node:test";

import { num } from "../../npm/dist/global/math/num.js";
import {
  GradientPathToCurve,
  GradientPrefix,
  IsGradientTexturePath,
  RasterizeGradient,
  RegisterGradientTexture
} from "../../npm/dist/trinity/core/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsResMan, TriTextureRes } from "../../npm/dist/resource/index.js";

// Carbon's wire shape (GradientTexture.cpp:10-23, Tr2CurveScalar.h:54-70):
// uint32 width, four { uint16 keyCount, uint8 before, uint8 after }, then the
// keys of r, g, b and a in order, 20 bytes each.
function gradientPath(width, channels)
{
  const keyCount = channels.reduce((total, channel) => total + channel.keys.length, 0);
  const bytes = new Uint8Array(20 + keyCount * 20);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, width, true);
  channels.forEach((channel, index) =>
  {
    const offset = 4 + index * 4;
    view.setUint16(offset, channel.keys.length, true);
    view.setUint8(offset + 2, channel.extrapolationBefore ?? 0);
    view.setUint8(offset + 3, channel.extrapolationAfter ?? 0);
  });
  let cursor = 20;
  for (const channel of channels)
  {
    for (const key of channel.keys)
    {
      view.setFloat32(cursor, key.time, true);
      view.setFloat32(cursor + 4, key.value, true);
      view.setFloat32(cursor + 8, key.leftTangent ?? 0, true);
      view.setFloat32(cursor + 12, key.rightTangent ?? 0, true);
      view.setUint16(cursor + 16, key.id ?? 0, true);
      view.setUint8(cursor + 18, key.interpolation ?? 1);
      view.setUint8(cursor + 19, key.tangentType ?? 0);
      cursor += 20;
    }
  }
  return GradientPrefix + Buffer.from(bytes).toString("base64");
}

const rampChannel = { keys: [ { time: 0, value: 0 }, { time: 1, value: 1 } ] };
const emptyChannel = { keys: [] };
const half = value => num.fromHalfFloat(num.toHalfFloat(value));

test("a gradient path rasterizes each channel across the texture width", () =>
{
  const path = gradientPath(3, [ rampChannel, emptyChannel, emptyChannel, { keys: [ { time: 0, value: 1 } ] } ]);
  assert.equal(IsGradientTexturePath(path), true);

  const payload = RasterizeGradient(path);
  assert.equal(payload.payloadType, "rgba");
  assert.equal(payload.pixelFormat, "rgba32float");
  assert.equal(payload.width, 3);
  assert.equal(payload.height, 1);
  assert.equal(payload.strideBytes, 48);
  assert.equal(payload.data.length, 12);

  // Carbon samples i / (width - 1), and stores each sample as a half float.
  assert.equal(payload.data[0], half(0));
  assert.equal(payload.data[4], half(0.5));
  assert.equal(payload.data[8], half(1));
  // A channel with no keys is 0 everywhere; a single key holds its value.
  assert.deepEqual([ payload.data[1], payload.data[5], payload.data[9] ], [ 0, 0, 0 ]);
  assert.deepEqual([ payload.data[3], payload.data[7], payload.data[11] ], [ 1, 1, 1 ]);
});

test("a one-pixel gradient samples the curve at its midpoint", () =>
{
  const payload = RasterizeGradient(gradientPath(1, [ rampChannel, emptyChannel, emptyChannel, emptyChannel ]));
  assert.equal(payload.width, 1);
  assert.equal(payload.data[0], half(0.5));
});

test("GradientPathToCurve returns the colour curve the path describes", () =>
{
  const { curve, width } = GradientPathToCurve(gradientPath(8, [ rampChannel, emptyChannel, emptyChannel, rampChannel ]));
  assert.equal(width, 8);
  assert.equal(curve.r.GetKeys().length, 2);
  assert.equal(curve.g.GetKeys().length, 0);
  assert.equal(curve.a.GetKeys().length, 2);
  assert.equal(curve.r.GetValue(1), 1);
});

test("every condition Carbon abandons yields no texture", () =>
{
  assert.equal(RasterizeGradient("res:/texture.dds"), null);
  // Not base64.
  assert.equal(RasterizeGradient(`${GradientPrefix}!!!!`), null);
  // Shorter than the header.
  assert.equal(RasterizeGradient(GradientPrefix + Buffer.from(new Uint8Array(8)).toString("base64")), null);
  // Zero width.
  assert.equal(RasterizeGradient(gradientPath(0, [ rampChannel, emptyChannel, emptyChannel, emptyChannel ])), null);
  // A key count that disagrees with the payload size.
  const short = gradientPath(4, [ rampChannel, emptyChannel, emptyChannel, emptyChannel ]);
  const truncated = Buffer.from(short.slice(GradientPrefix.length), "base64").subarray(0, 40);
  assert.equal(RasterizeGradient(GradientPrefix + truncated.toString("base64")), null);
  assert.equal(GradientPathToCurve(`${GradientPrefix}!!!!`), null);
});

test("dynamic:/gradient_1d resolves through the resource manager without a source read", async () =>
{
  let reads = 0;
  const resMan = new CjsResMan({ source: { Read() { reads += 1; return new Uint8Array(0); } } });
  RegisterGradientTexture(resMan);

  const path = gradientPath(2, [ rampChannel, emptyChannel, emptyChannel, emptyChannel ]);
  const texture = resMan.GetResource(path);
  assert.equal(CjsSchema.cast(texture, TriTextureRes), texture);
  assert.equal(texture.IsGood(), true);
  assert.equal(texture.GetPayload().width, 2);
  assert.equal(texture.width, 2);
  // Identical queries share one resource.
  assert.equal(resMan.GetResource(path), texture);

  await texture.Ready();
  assert.equal(reads, 0);
});

test("an invalid gradient fails its texture instead of reading a source", async () =>
{
  let reads = 0;
  const resMan = new CjsResMan({ source: { Read() { reads += 1; return new Uint8Array(0); } } });
  RegisterGradientTexture(resMan);

  const broken = resMan.GetResource(`${GradientPrefix}!!!!`);
  assert.equal(broken.IsFailed(), true);
  assert.equal(broken.error.code, "CJS_TEXTURE_PROCEDURAL_PATH_INVALID");
  await assert.rejects(
    resMan.GetObject(`${GradientPrefix}!!!!`),
    error => error.code === "CJS_TEXTURE_PROCEDURAL_PATH_INVALID"
  );
  assert.equal(reads, 0);
});
