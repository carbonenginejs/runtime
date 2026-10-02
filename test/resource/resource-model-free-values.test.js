import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CjsSchema } from "../../src/global/schema/index.js";
import { CjsCarbonEffectReader } from "../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { Tr2EffectLibrary, Tr2EffectRes, Tr2EffectStageInput, Tr2Shader } from "../../src/resource/shader/index.js";

const effectFile = process.env.CJS_MODEL_FREE_EFFECT_FILE;
const libraryFile = process.env.CJS_MODEL_FREE_LIBRARY_EFFECT_FILE;

test("a real High effect preserves every body through model-free schema values", {
  skip: !effectFile && "Set CJS_MODEL_FREE_EFFECT_FILE to a cached High .sm_depth container."
}, () =>
{
  const bytes = new Uint8Array(readFileSync(effectFile));
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
  let controlValues;
  for (let index = 0; index < reader.records.length; index++)
  {
    const original = resource.GetShaderByIndex(index);
    const values = CjsSchema.getValues(original);
    const restored = CjsSchema.from("Tr2Shader", values);
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
    controlValues ??= values;
  }
  assert.ok(reader.records.length > 0);
  const output = writer.toBytes();
  assert.ok(output.length === bytes.length && output.every((byte, index) => byte === bytes[index]),
    `Re-emitted container differs: ${bytes.length} input bytes, ${output.length} output bytes.`);

  // Losing a nested factory must fail this same real graph. The old plain
  // schema coercion path copied values but did not rebuild typed stage maps.
  const stageFactory = Tr2EffectStageInput.from;
  try
  {
    Tr2EffectStageInput.from = values =>
    {
      const stage = new Tr2EffectStageInput();
      CjsSchema.setValuesFromSchema(stage, values);
      return stage;
    };
    assert.throws(() => Tr2Shader.from(controlValues).effect.toCarbonBinary(), TypeError);
  }
  finally
  {
    Tr2EffectStageInput.from = stageFactory;
  }

  try
  {
    Tr2EffectStageInput.from = values =>
    {
      const stage = stageFactory.call(Tr2EffectStageInput, values);
      if (stage.sourceProgram) stage.sourceProgram.bytes = values.sourceProgram.bytes;
      return stage;
    };
    const broken = Tr2Shader.from(controlValues).effect.toCarbonBinary();
    const original = resource.GetShaderByIndex(0).effect.toCarbonBinary();
    assert.notEqual(JSON.stringify(broken).length, JSON.stringify(original).length,
      "Leaving JSON program bytes as arrays loses the bytecode on re-emission.");
  }
  finally
  {
    Tr2EffectStageInput.from = stageFactory;
  }
});

test("a real High raytracing library retains its program bytes through schema values", {
  skip: !libraryFile && "Set CJS_MODEL_FREE_LIBRARY_EFFECT_FILE to the cached High rtshadows.sm_depth container."
}, () =>
{
  const bytes = new Uint8Array(readFileSync(libraryFile));
  const reader = new CjsCarbonEffectReader(bytes);
  assert.equal(reader.records.length, 1);
  assert.equal(reader.permutations.length, 0);
  const source = new Tr2EffectRes().DoLoad(bytes).GetShaderByIndex(0);
  const values = CjsSchema.getValues(source);
  const restored = CjsSchema.from("Tr2Shader", values);
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

  const libraryFactory = Tr2EffectLibrary.from;
  try
  {
    Tr2EffectLibrary.from = values =>
    {
      const result = libraryFactory.call(Tr2EffectLibrary, values);
      result.sourceProgram.bytes = values.sourceProgram.bytes;
      return result;
    };
    const broken = Tr2Shader.from(values).effect.toCarbonBinary();
    assert.notEqual(JSON.stringify(broken).length, JSON.stringify(source.effect.toCarbonBinary()).length,
      "A JSON array cannot replace the library's binary program buffer.");
  }
  finally
  {
    Tr2EffectLibrary.from = libraryFactory;
  }
});
