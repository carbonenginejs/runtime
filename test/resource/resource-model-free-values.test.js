import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsCarbonEffectReader } from "../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { Tr2EffectRes } from "../../src/trinity/shader/Tr2EffectRes.js";
import { Tr2Shader } from "../../src/trinity/shader/Tr2Shader.js";
import { clientResources } from "../support/clientResources.js";

// Real High effects from the client through BePaths. The effect file the
// first test was written against is unrecorded; its assertions (shader 4 Main
// pixel: PatternMask1MapSampler at s1, 608 constant bytes) are satisfied by
// any of the four quaddetailv5 variants (plain, skinned_, unpacked_,
// unpackedskinned_), so the plain one is named.
const client = await clientResources();
const effectFile = "res:/graphics/effect.dx11/managed/space/spaceobject/v5/quad/quaddetailv5.sm_depth";
const libraryFile = "res:/graphics/effect.dx12/managed/space/system/raytracing/rtshadows.sm_depth";

test("a real High effect preserves every body through binary shader reconstruction", {
  skip: client.skip ?? false
}, async () =>
{
  const bytes = new Uint8Array(await client.Read(effectFile));
  const reader = new CjsCarbonEffectReader(bytes);
  const resource = new Tr2EffectRes().DoLoad(bytes);
  const writer = new CjsCarbonEffectWriter({
    compilerVersion: reader.compilerVersion,
    sourceHash: new TextDecoder().decode(reader.sourceHash)
  });
  for (const axis of reader.permutations)
  {
    writer.addPermutation({
      name: axis.name.value,
      options: axis.options.map(option => option.value),
      defaultOption: axis.defaultOption,
      description: axis.description.value,
      type: axis.type
    });
  }
  for (let index = 0; index < reader.records.length; index++)
  {
    const original = resource.GetShaderByIndex(index);
    const restored = Tr2Shader.fromCarbonBinary(reader, index);
    assert.equal("GetValues" in restored, false);
    assert.equal("SetValues" in restored, false);
    assert.notEqual(restored.effect, original.effect);
    if (index === 4)
    {
      const main = restored.effect.techniques.find(technique => technique.name === "Main");
      const pixel = main.passes[0].stageInputs[1];
      assert.equal(pixel.samplers.get(1).name, "PatternMask1MapSampler");
      assert.equal(pixel.constantValues.byteLength, 608);
    }
    writer.addBody(index, restored.effect.toCarbonBinary());
  }
  assert.ok(reader.records.length > 0);
  const output = writer.toBytes();
  assert.ok(output.length === bytes.length && output.every((byte, index) => byte === bytes[index]),
    `Re-emitted container differs: ${bytes.length} input bytes, ${output.length} output bytes.`);
});

test("a real High raytracing library retains its program bytes through binary shader reconstruction", {
  skip: client.skip ?? false
}, async () =>
{
  const bytes = new Uint8Array(await client.Read(libraryFile));
  const reader = new CjsCarbonEffectReader(bytes);
  assert.equal(reader.records.length, 1);
  assert.equal(reader.permutations.length, 0);
  const restored = Tr2Shader.fromCarbonBinary(reader, 0);
  const library = restored.effect.techniques[0].libraries[0];
  assert.ok(library.sourceProgram.bytes instanceof Uint8Array);
  assert.equal(library.sourceProgram.bytes.length, 9748);
  assert.equal(library.globalInput.resources.get(0).name, "RtShadowScene");
  const writer = new CjsCarbonEffectWriter({
    compilerVersion: reader.compilerVersion,
    sourceHash: new TextDecoder().decode(reader.sourceHash)
  });
  writer.addBody(0, restored.effect.toCarbonBinary());
  const output = writer.toBytes();
  assert.ok(output.length === bytes.length && output.every((byte, index) => byte === bytes[index]),
    `Re-emitted library differs: ${bytes.length} input bytes, ${output.length} output bytes.`);
});
