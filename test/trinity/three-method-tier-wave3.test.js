import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveCloudVolumeTextureParameter,
  Tr2EffectResource,
  Tr2EffectStageInput,
  Tr2EffectTechnique,
  Tr2Pass,
  Tr2Shader,
  Tr2Sprite2dPickingMask,
  Tr2StreamingBitmapSaver
} from "../../npm/dist/trinity/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";

/**
 * The three-method-tier wave-3 ports - the three classes promoted out of
 * generated/ on 2026-09-06
 * (docs/research/ratchet-three-method-tier-2026-09-06.md).
 */

/** A 4x4 mask duck with red 255 only at (2,2), the Tr2ImageRes surface. */
function maskDuck()
{
  return {
    IsGood: () => true,
    GetWidth: () => 4,
    GetHeight: () => 4,
    GetPixelColor: (x, y) => (x === 2 && y === 2 ? [ 255, 0, 0, 255 ] : [ 0, 0, 0, 0 ])
  };
}

test("Tr2Sprite2dPickingMask paths: guard, clear, and no-manager fetch (cpp:18-31)", () =>
{
  const mask = new Tr2Sprite2dPickingMask();
  assert.equal(mask.GetMaskPath(), "");

  mask.mask = maskDuck();
  mask.SetMaskPath("res:/ui/mask.tga");
  assert.equal(mask.GetMaskPath(), "res:/ui/mask.tga");
  assert.equal(mask.mask, null, "a path change clears the mask before refetching");

  const marker = maskDuck();
  mask.mask = marker;
  mask.SetMaskPath("res:/ui/mask.tga");
  assert.equal(mask.mask, marker, "a redundant set is guarded and keeps the mask");
});

test("Tr2Sprite2dPickingMask.SampleMask: Carbon's 9-slice inverse mapping and threshold (cpp:33-107)", () =>
{
  const picking = new Tr2Sprite2dPickingMask();
  picking.mask = maskDuck();
  picking.leftEdge = picking.rightEdge = picking.topEdge = picking.bottomEdge = 1;
  picking.channel = 2; // Carbon's BGRA chooser: 2 is RED.
  picking.threshold = 0;

  // Sprite rect 8x8 at origin. Point (4.5,4.5) - Carbon subtracts the 0.5
  // cursor centre - lands at x=y=4: the centre region stretches
  // (4-1)/(8-2)*(4-2)+1 = 2, the red texel.
  assert.equal(picking.SampleMask([ 4.5, 4.5 ], [ 0, 0 ], 8, 8), true);

  // The leading edge maps 1:1 - (0.9,0.9) becomes texel (0,0), which is dark.
  assert.equal(picking.SampleMask([ 0.9, 0.9 ], [ 0, 0 ], 8, 8), false);

  // The channel must EXCEED the threshold, so 1.0 fails at threshold 1.
  picking.threshold = 1;
  assert.equal(picking.SampleMask([ 4.5, 4.5 ], [ 0, 0 ], 8, 8), false);

  // Edges wider than the bitmap refuse outright (cpp:44-51).
  picking.threshold = 0;
  picking.leftEdge = 3;
  picking.rightEdge = 3;
  assert.equal(picking.SampleMask([ 4.5, 4.5 ], [ 0, 0 ], 8, 8), false);

  // No mask, no hit.
  picking.mask = null;
  assert.equal(picking.SampleMask([ 4.5, 4.5 ], [ 0, 0 ], 8, 8), false);
});

test("Tr2StreamingBitmapSaver.StartSaving writes the TGA header and latches state (cpp:45-100)", () =>
{
  const written = [];
  const sink = { Write: bytes => { written.push(Uint8Array.from(bytes)); return bytes.length; } };

  const saver = new Tr2StreamingBitmapSaver();
  assert.equal(saver.IsSaving(), false);
  assert.equal(saver.HasStartedBatch(), false);

  assert.notEqual(saver.StartSaving(sink, 0, 32, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM), 0,
    "zero width refuses (E_INVALIDARG)");
  assert.notEqual(saver.StartSaving(sink, 640, 480, PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT), 0,
    "the header switch is the real format gate; float formats refuse");
  assert.equal(saver.IsSaving(), false);

  assert.equal(saver.StartSaving(sink, 640, 480, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM), 0, "S_OK");
  assert.equal(saver.IsSaving(), true);
  assert.equal(saver.width, 640);
  assert.equal(saver.height, 480);
  assert.equal(saver.format, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(saver.currentOffset, 480, "rows are written bottom-up, the cursor starts at the height");

  const header = written[0];
  assert.equal(header.length, 18);
  assert.equal(header[2], 2, "IMAGE_TYPE_RAW_RGB");
  assert.equal(header[12] | (header[13] << 8), 640);
  assert.equal(header[14] | (header[15] << 8), 480);
  assert.equal(header[16], 32, "B8G8R8A8 is 32bpp");

  // R8 output is 8bpp greyscale (Tr2TgaHandler.cpp SaveHeader).
  const greySink = { Write: bytes => bytes.length };
  const grey = new Tr2StreamingBitmapSaver();
  assert.equal(grey.StartSaving(greySink, 4, 4, PixelFormat.PIXEL_FORMAT_R8_UNORM), 0);
  assert.equal(grey.HasStartedBatch(), false, "no batch until StartBatch");
});

/** The shader.test.js reflection fixture: one technique, one pass, named resources. */
function shaderWithResource(name)
{
  const stage = new Tr2EffectStageInput();
  stage.resources = new Map([ [ 0, Object.assign(new Tr2EffectResource(), { name }) ] ]);
  const pass = new Tr2Pass();
  pass.stageInputs = [ stage ];
  const technique = new Tr2EffectTechnique();
  technique.name = "Main";
  technique.passes = [ pass ];
  const shader = new Tr2Shader();
  shader.effect.techniques = [ technique ];
  return shader;
}

test("EveCloudVolumeTextureParameter: identity hash, name, and the resource probe (cpp:394-441)", () =>
{
  const parameter = new EveCloudVolumeTextureParameter();
  parameter.name = "VolumeDensity";
  assert.equal(parameter.GetParameterName(), "VolumeDensity");

  // Carbon hashes the volume POINTER: same object, same hash; different
  // object, different hash.
  const volume = {};
  parameter.volume = volume;
  const first = parameter.GetHashValue();
  assert.equal(parameter.GetHashValue(), first);
  parameter.volume = {};
  assert.notEqual(parameter.GetHashValue(), first);

  // RebuildEffectHandles: cleared first, set only when the shader declares
  // the resource (cpp:399-413).
  parameter.isUsedByEffect = true;
  parameter.RebuildEffectHandles(null);
  assert.equal(parameter.isUsedByEffect, false, "no shader clears the flag");

  parameter.RebuildEffectHandles(shaderWithResource("VolumeDensity"));
  assert.equal(parameter.isUsedByEffect, true);

  parameter.RebuildEffectHandles(shaderWithResource("SomethingElse"));
  assert.equal(parameter.isUsedByEffect, false);

  parameter.name = "";
  parameter.isUsedByEffect = true;
  parameter.RebuildEffectHandles(shaderWithResource("VolumeDensity"));
  assert.equal(parameter.isUsedByEffect, false, "an empty name early-outs after the clear");
});
