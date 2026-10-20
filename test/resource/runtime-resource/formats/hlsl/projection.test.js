import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { Tr2EffectDescription } from "../../../../../src/resource/shader/reflection/Tr2EffectDescription.js";
import { Tr2EffectRes, GetGlobalEffectOptions, ModifyGlobalEffectOptions } from "../../../../../src/resource/shader/Tr2EffectRes.js";
import { buildEffectBindingManifest } from "../../../../../src/resource/format/effect/effectBindingManifest.js";
import { effectHeader } from "../../../../../src/resource/format/effect/effectHeader.js";
import { effectiveConstantDefaults } from "../../../../../src/resource/format/effect/effectProjection.js";
import { CjsHlslFormat, readEffectAnalysis } from "../../../../../src/resource/formats/hlsl/index.js";
import { buildSyntheticDescription, stage, blob, str } from "../../format/carbonEffectSynthetic.js";
import { buildEffectBytes } from "./synthetic.js";

/** Write synthetic source records without using reflection or the projection. */
function write(description, axes = [])
{
    const writer = new CjsCarbonEffectWriter({ compilerVersion: [ 1, 2, 3, 4 ] });
    for (const axis of axes) writer.addPermutation(axis);
    const count = axes.reduce((n, axis) => n * axis.options.length, 1);
    for (let index = 0; index < count; index++) writer.addBody(index, description);
    return writer.toBytes();
}

/** Read the canonical resource and return its cached description. */
function load(description)
{
    const resource = CjsHlslFormat.read(write(description), { emit: "raw", source: "synthetic" });
    return { resource, description: resource.GetShaderByIndex(0).GetEffectDescription() };
}

test("canonical projection matches the frozen pre-removal semantic manifest", () =>
{
    const source = buildSyntheticDescription();
    source.techniques[0].passes[0].stages.push(
        stage(3, { label: "G" }),
        stage(4, { label: "H" }),
        stage(5, { label: "D" })
    );
    const { description } = load(source);
    const manifest = buildEffectBindingManifest(description, { version: 15, effectName: "synthetic" });
    // Captured from the pre-removal implementation. Only the three explicitly
    // changed diagnostics (handles and live arena offsets) were updated.
    const expected = JSON.parse(readFileSync(new URL("./fixtures/binding-manifest.json", import.meta.url)));
    assert.deepEqual(JSON.parse(JSON.stringify(manifest)), expected);
    assert.deepEqual(manifest.stages.slice(0, 5).map(entry => entry.stageName),
        [ "vertex", "pixel", "geometry", "hull", "domain" ]);

    for (const entry of manifest.stages)
    {
        for (const binding of entry.bindings)
        {
            assert.equal(manifest.resolve({
                techniqueName: entry.techniqueName,
                passIndex: entry.passIndex,
                stageType: entry.stageType,
                symbol: binding.generatedSymbol,
                registerSpace: binding.registerSpace
            }), binding);
        }
    }
});

test("effective defaults clamp and extend without changing authored bytes", () =>
{
    const source = buildSyntheticDescription();
    const input = source.techniques[0].passes[0].stages[0];
    input.defaultValues = blob(Uint8Array.from({ length: 5000 }, (_, index) => index % 251));
    input.constants[1].name = str("ADiffuseSampler");
    input.constants[1].offset = 4100;
    const { description } = load(source);
    const canonical = description.techniques[0].passes[0].stageInputs[0];
    const bytes = canonical.constantValues.slice();
    const projected = effectiveConstantDefaults(canonical);
    assert.equal(projected.constantValueSize, 4104);
    assert.deepEqual(projected.constantValues.subarray(0, 4096), bytes.subarray(0, 4096));
    assert.deepEqual(projected.constantValues.subarray(4096), new Uint8Array(8));
    assert.equal(canonical.constantValueSize, 5000);
    assert.deepEqual(canonical.constantValues, bytes);
});

test("static sampler names are suppressed only in the projection and floats retain their bits", () =>
{
    const source = buildSyntheticDescription();
    const input = source.techniques[0].passes[0].stages[0];
    input.samplers[0].isDynamic = 0;
    input.samplers[0].mipLODBias = -0;
    input.staticSamplers.push({ ...input.staticSamplers[0], registerSpace: 7, borderColor: 1 });
    const description = Tr2EffectDescription.fromCarbonBinary(source);
    const canonical = description.techniques[0].passes[0].stageInputs[0];
    const manifest = buildEffectBindingManifest(description);
    const dynamicSlot = manifest.resolve({ techniqueName: "Main", passIndex: 0, stageType: 0, symbol: "s0" });
    assert.equal(canonical.samplers.get(0).name, "ADiffuseSampler");
    assert.equal(canonical.samplers.get(0).sampler.mipLODBiasRaw, 0x80000000);
    assert.equal(dynamicSlot.metadataName, null);
    assert.equal(dynamicSlot.carbon.sampler.isDynamic, false);
    assert.ok(Object.is(dynamicSlot.carbon.sampler.mipLODBias, -0));
    assert.deepEqual(manifest.resolve({
        techniqueName: "Main", passIndex: 0, stageType: 0, symbol: "s5", registerSpace: 7
    }).carbon.sampler.borderColor, [ 0, 0, 0, 1 ]);
    assert.deepEqual(manifest.resolve({
        techniqueName: "Main", passIndex: 0, stageType: 0, symbol: "s5", registerSpace: 1
    }).carbon.sampler.borderColor, [ 1, 1, 1, 1 ]);
});

test("heap views derive from parameter annotations without a resource-set instance", () =>
{
    const { description } = load(buildSyntheticDescription());
    const pass = description.techniques[0].passes[0];
    assert.equal(pass.resourceSetDesc, null);
    const binding = buildEffectBindingManifest(description).resolve({
        techniqueName: "Main", passIndex: 0, stageType: 0, symbol: "t0"
    });
    assert.equal(binding.heapView, true);
    assert.equal(binding.carbon.isSRGB, true);
    assert.equal(pass.resourceSetDesc, null);
});

test("header projection shares bytes and never decodes bodies", () =>
{
    const resource = CjsHlslFormat.read(write(buildSyntheticDescription()), { emit: "raw" });
    assert.equal(resource.constructor, Tr2EffectRes);
    resource.GetShaderByIndex = () => { throw new Error("header decoded a body"); };
    const header = effectHeader(resource);
    assert.equal(header.bytes, resource.GetContainerBytes());
    assert.equal(header.bytes.buffer, resource.GetContainerBytes().buffer);
    assert.equal(effectHeader(resource), header);
    assert.equal(header.version, 15);
    assert.deepEqual(header.compilerVersionBytes, [ 1, 2, 3, 4 ]);
});

test("format selection shares canonical globals and exact-index caching bypasses them", () =>
{
    const prior = GetGlobalEffectOptions();
    for (const option of prior) ModifyGlobalEffectOptions([ { name: option.name, value: "" } ]);
    const bytes = write(buildSyntheticDescription(), [
        { name: "MODE", options: [ "OFF", "ON" ], defaultOption: 1, description: "", type: 0 }
    ]);
    try
    {
        const raw = CjsHlslFormat.read(bytes, { emit: "raw" });
        const exact = raw.GetShaderByIndex(0);
        assert.equal(raw.GetShaderByIndex(0), exact);
        ModifyGlobalEffectOptions([ { name: "MODE", value: "OFF" } ]);
        const analysis = readEffectAnalysis(bytes, { permutation: [ { name: "MODE", value: "ON" } ] });
        assert.equal(analysis.selection.bodyIndex, 0);
        assert.equal(analysis.selection.selectedOptions[0].source, "global");
        assert.equal(raw.GetShader([ { name: "MODE", value: "ON" } ]), exact);
        ModifyGlobalEffectOptions([ { name: "MODE", value: "invalid" } ]);
        assert.equal(readEffectAnalysis(bytes, { permutation: [ { name: "MODE", value: "OFF" } ] }).selection.bodyIndex, 1);
        assert.equal(raw.GetShaderByIndex(0), exact);
        ModifyGlobalEffectOptions([ { name: "MODE", value: "" } ]);
        assert.equal(readEffectAnalysis(bytes, {
            permutation: [ { name: "MODE", value: "ON" }, { name: "MODE", value: "OFF" } ]
        }).selection.bodyIndex, 0);
    }
    finally
    {
        ModifyGlobalEffectOptions([ { name: "MODE", value: "" } ]);
        ModifyGlobalEffectOptions(prior);
    }
});

test("libraries retain programs, exports and both canonical inputs", () =>
{
    const source = buildSyntheticDescription();
    const { description } = load(source);
    const library = description.techniques[1].libraries[0];
    assert.deepEqual(library.sourceProgram.bytes, source.techniques[1].libraries[0].shaderData.bytes);
    assert.equal(library.globalInput.constants[0].name, "AGConstant");
    assert.equal(library.localInput.constants[0].name, "ALConstant");
    assert.equal(library.localInput.constantValues.length, 0);
    const emitted = CjsHlslFormat.read(write(source), { source: "synthetic" });
    assert.deepEqual(emitted.effect.techniques[1].libraries[0].sourceProgram.bytes, Array.from(library.sourceProgram.bytes));
    assert.equal(emitted.effect.techniques[1].libraries[0].closestHitName, "ClosestHit");
});

test("canonical construction rejects duplicate stages and non-record inputs", () =>
{
    const source = buildSyntheticDescription();
    source.techniques[0].passes[0].stages.push(stage(0));
    assert.throws(() => Tr2EffectDescription.fromCarbonBinary(source), /duplicat|twice/i);
    assert.throws(() => Tr2EffectDescription.fromCarbonBinary(null), /record must be an object/i);
});

for (let version = 8; version <= 15; version++)
{
    test(`format header and malformed body handling retain version ${version}`, () =>
    {
        const bytes = buildEffectBytes({ version });
        const raw = CjsHlslFormat.read(bytes, { emit: "raw" });
        assert.equal(effectHeader(raw).version, version);
        assert.equal(CjsHlslFormat.read(bytes).effect, null);
        const bad = bytes.slice();
        new DataView(bad.buffer).setUint32(0, 99, true);
        assert.throws(() => CjsHlslFormat.read(bad), /version/i);
    });
}
