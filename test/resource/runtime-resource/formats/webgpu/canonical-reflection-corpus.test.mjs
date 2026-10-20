import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsHlslFormat } from "../../../../../src/resource/formats/hlsl/index.js";
import { float32ToBits } from "../../../../../src/global/utils/bytes.js";

const directory = process.env.CARBON_EFFECT_CORPUS_DIR;
const extensions = new Set([ ".sm_hi", ".sm_lo", ".sm_depth" ]);

/** Enumerate local, opt-in effect content without following directory links. */
async function* walk(root)
{
    for (const entry of await readdir(root, { withFileTypes: true }))
    {
        const file = path.join(root, entry.name);
        if (entry.isDirectory()) yield* walk(file);
        else if (entry.isFile() && extensions.has(path.extname(entry.name))) yield file;
    }
}

/** Check authored values directly against wire records, not another projection. */
function checkInput(canonical, record)
{
    assert.deepEqual(canonical.constantValues, record.defaultValues.bytes);
    assert.equal(canonical.constantValueSize, record.defaultValues.size);
    assert.equal(canonical.constants.length, record.constants.length);
    assert.equal(canonical.resources.size, record.textures.length);
    assert.equal(canonical.uavs.size, record.uavs.length);
    assert.equal(canonical.samplers.size, record.samplers.length);
    assert.equal(canonical.signature.staticSamplers.length, record.staticSamplers.length);
    for (const sampler of record.samplers)
    {
        const setup = canonical.samplers.get(sampler.registerIndex);
        assert.equal(setup.name, sampler.name.value);
        assert.equal(setup.isDynamic, Boolean(sampler.isDynamic));
        assert.equal(setup.sampler.mipLODBiasRaw, float32ToBits(sampler.mipLODBias));
    }
}

test("canonical resource retains every opted-in corpus body and caches exact selections", {
    skip: directory ? false : "set CARBON_EFFECT_CORPUS_DIR for canonical read-back"
}, async () =>
{
    let files = 0, bodies = 0, stages = 0;
    for await (const file of walk(directory))
    {
        const bytes = new Uint8Array(await readFile(file));
        const wire = new CjsCarbonEffectReader(bytes);
        const resource = CjsHlslFormat.read(bytes, { emit: "raw", source: file });
        const seen = new Set();
        for (const [index, row] of wire.records.entries())
        {
            const identity = `${row.offset}:${row.size}`;
            if (seen.has(identity)) continue;
            seen.add(identity);
            const shader = resource.GetShaderByIndex(index);
            assert.equal(resource.GetShaderByIndex(index), shader);
            const reflected = shader.GetEffectDescription();
            const record = wire.readDescription(index);
            assert.equal(reflected.techniques.length, record.techniques.length);
            for (const [techniqueIndex, technique] of record.techniques.entries())
            {
                const target = reflected.techniques[techniqueIndex];
                assert.equal(target.name, technique.name.value);
                assert.equal(target.passes.length, technique.passes.length);
                assert.equal(target.libraries.length, technique.libraries.length);
                for (const [passIndex, pass] of technique.passes.entries())
                {
                    const targetPass = target.passes[passIndex];
                    assert.deepEqual(targetPass.renderStateValues, pass.renderStates);
                    assert.deepEqual(targetPass.stageOrder, pass.stages.map(stage => stage.type));
                    for (const stage of pass.stages)
                    {
                        const input = targetPass.stageInputs[stage.type];
                        assert.equal(input.exists, true);
                        assert.deepEqual(input.sourceProgram.bytes, stage.shaderData.bytes);
                        checkInput(input, stage);
                        stages++;
                    }
                }
                for (const [libraryIndex, library] of technique.libraries.entries())
                {
                    const targetLibrary = target.libraries[libraryIndex];
                    assert.deepEqual(targetLibrary.sourceProgram.bytes, library.shaderData.bytes);
                    assert.deepEqual(targetLibrary.exports, library.exports.map(entry => ({
                        type: entry.type, name: entry.name.value
                    })));
                    checkInput(targetLibrary.globalInput, library.globalInputs);
                    checkInput(targetLibrary.localInput, library.localInputs);
                }
            }
            bodies++;
        }
        files++;
    }
    assert.ok(files > 0 && bodies > 0 && stages > 0, "the corpus must exercise nonempty shader bodies");
});
