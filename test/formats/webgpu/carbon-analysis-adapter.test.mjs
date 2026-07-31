import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectReader } from "../../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
import { HlslEffectBindingManifest } from "../../../src/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslShaderBytecode } from "../../../src/formats/hlsl/core/HlslShaderBytecode.js";
import { buildEffectAnalysis } from "../../../src/formats/webgpu/core/helpers.js";
import { readEffectAnalysis } from "../../../src/formats/webgpu/core/effectAnalysis.js";
import { runtimeDescriptionFromCarbon } from "../../../src/formats/hlsl/core/carbonDescriptionToRuntime.js";
import {
    buildSyntheticDescription,
    SYNTHETIC_PERMUTATIONS,
    str
} from "../../format/carbonEffectSynthetic.js";

/**
 * The two-sided analysis diff.
 *
 * `buildEffectAnalysis` is run twice — once over the description the HLSL reader
 * produces from the file, once over the description the shape adapter rebuilds
 * from the same file's Carbon records — and the two documents are diffed. Because
 * both sides call the *same* function, the diff isolates exactly one property:
 * whether `runtimeDescriptionFromCarbon` reconstructs the description faithfully.
 *
 * **One file, read two ways.** The synthetic effect is written once and both
 * sides read those same bytes, so the arena is shared and every offset agrees.
 * That is what lets the diff be total — no excluded fields, no normalisation —
 * which matters because the failure class this catches is a field that is
 * *accidentally correct*: `isSRGB` as `0` rather than `false`, or a sampler name
 * as `""` rather than `null`. Both are falsy, both behave correctly everywhere
 * the engine reads them, and only a strict structural diff ever sees them.
 *
 * This test is **not scaffolding for the switchover**. The property is permanent:
 * as long as two paths derive one analysis, they have to agree. It is also
 * deliberately redundant with the closed mapping table in the adapter, and
 * neither replaces the other — the table catches *the wire has something we do
 * not handle*, this catches *our output differs from the reference*. A complete
 * table can still map a field wrongly, and a passing diff here says nothing about
 * a key this fixture never exercises.
 */

const COMPILER_VERSION = [ 1, 2, 6, 0 ];
const SOURCE_HASH = "0123456789abcdef0123456789abcdef";
const SOURCE = "memory";

/** WGSL/Carbon stage names by stage type, matching the HLSL reader's naming. */
const STAGE_NAME = Object.freeze({ 0: "vertex", 1: "pixel", 2: "compute" });

/**
 * Builds a synthetic description without raytracing libraries.
 *
 * The shared fixture carries a library so the record codec's library path is
 * covered. The adapter deliberately refuses to rebuild libraries rather than
 * dropping them silently, so the analysis diff runs on the library-free shape;
 * the refusal itself is asserted separately below.
 *
 * @param {object} [options] Fixture options.
 * @returns {object} Description record tree.
 */
function describeWithoutLibraries(options = {})
{
    const description = buildSyntheticDescription(options);
    for (const technique of description.techniques) technique.libraries = [];
    return description;
}

/**
 * Writes one synthetic v15 Carbon effect file.
 *
 * @param {object} description Description record tree.
 * @returns {Uint8Array} Carbon effect bytes.
 */
function writeEffectFile(perBody)
{
    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);

    // Each body carries distinct names, so reading the wrong permutation is a
    // visible difference rather than a silent no-op. Four identical bodies would
    // make the diff pass whichever body either side happened to read, which is
    // the same shape of mistake as a check that cannot fail.
    const build = perBody ?? ((index) => describeWithoutLibraries({ label: `Body${index}` }));
    for (let index = 0; index < 4; index += 1) writer.addBody(index, build(index));
    return writer.toBytes();
}

/**
 * Builds the analysis the packager builds today, straight from the source file.
 *
 * @param {Uint8Array} bytes Carbon effect bytes.
 * @returns {object} Analysis document.
 */
function analysisFromSource(bytes)
{
    const resolved = readEffectAnalysis(bytes, { source: SOURCE });
    lastSourceSelection = {
        bodyIndex: resolved.selection?.bodyIndex ?? 0,
        selectedOptions: resolved.selection?.selectedOptions ?? [],
        compilerVersion: resolved.effectRes?.m_compilerVersion ?? null
    };
    return buildEffectAnalysis(resolved, { source: SOURCE, decodeBytecode: false });
}

/**
 * Selection the source side resolved, so the container side reads the same body.
 *
 * Permutation selection is the *packager's* job and not the adapter's, so the
 * container side is pointed at whichever body the source side selected rather
 * than defaulting to zero. Handing both sides the same body is what keeps the
 * diff about the adapter; letting them differ would compare two different
 * permutations and call it a mapping bug.
 */
let lastSourceSelection = { bodyIndex: 0, selectedOptions: [], compilerVersion: null };

/**
 * Builds the analysis from the container records through the shape adapter.
 *
 * @param {Uint8Array} bytes Carbon effect bytes.
 * @param {object} [options] Adapter options.
 * @returns {object} Analysis document.
 */
function analysisFromContainer(bytes, options = {}, bodyIndex)
{
    const reader = new CjsCarbonEffectReader(bytes, { source: SOURCE });
    const selection = lastSourceSelection;
    const description = reader.readDescription(bodyIndex ?? selection.bodyIndex);

    const effectDescription = runtimeDescriptionFromCarbon(description, {
        effectName: SOURCE,
        version: reader.version,
        bytecodeFor: (stage, stageType) => new HlslShaderBytecode({
            stageType,
            stageName: STAGE_NAME[stageType] ?? null,
            bytes: stage.shaderData.bytes,
            shaderSize: stage.shaderData.size,
            stringTableOffset: stage.shaderData.offset,
            effectName: SOURCE
        }),
        ...options
    });

    const resolved = {
        effectDescription,
        bindingManifest: HlslEffectBindingManifest.fromEffectDescription(effectDescription, {
            effectName: SOURCE
        }),
        effectRes: { sourcePath: SOURCE, m_compilerVersion: selection.compilerVersion },
        selection: {
            bodyIndex: selection.bodyIndex,
            selectedOptions: selection.selectedOptions
        }
    };

    return buildEffectAnalysis(resolved, { source: SOURCE, decodeBytecode: false });
}

/**
 * Collects every differing JSON path between two documents.
 *
 * Reported as paths rather than as an equality assertion, because "these two
 * 400 KB documents differ" is not a diagnosis.
 *
 * @param {*} left Reference value.
 * @param {*} right Candidate value.
 * @param {string} [path] Current path.
 * @param {string[]} [out] Accumulated differences.
 * @returns {string[]} Differing paths.
 */
function diffPaths(left, right, path = "", out = [])
{
    if (Array.isArray(left) || Array.isArray(right))
    {
        if (!Array.isArray(left) || !Array.isArray(right))
        {
            out.push(`${path}: array/non-array (${typeof left} vs ${typeof right})`);
            return out;
        }
        if (left.length !== right.length)
        {
            out.push(`${path}: length ${left.length} vs ${right.length}`);
            return out;
        }
        for (let index = 0; index < left.length; index += 1)
        {
            diffPaths(left[index], right[index], `${path}[${index}]`, out);
        }
        return out;
    }

    if (left && right && typeof left === "object" && typeof right === "object")
    {
        const keys = new Set([ ...Object.keys(left), ...Object.keys(right) ]);
        for (const key of [ ...keys ].sort())
        {
            const has = Object.prototype.hasOwnProperty.call(left, key)
                && Object.prototype.hasOwnProperty.call(right, key);
            if (!has)
            {
                out.push(`${path}.${key}: present on only one side`);
                continue;
            }
            diffPaths(left[key], right[key], `${path}.${key}`, out);
        }
        return out;
    }

    if (!Object.is(left, right))
    {
        // Distinguishes the accidentally-correct cases: 0 vs false and "" vs null
        // are both falsy, and this is the only place they are visible.
        out.push(`${path}: ${JSON.stringify(left)} (${typeof left}) vs ${JSON.stringify(right)} (${typeof right})`);
    }
    return out;
}

/**
 * Finds one binding by stage key and generated symbol.
 *
 * @param {object} analysis Analysis document.
 * @param {string} key Stage key.
 * @param {string} symbol Generated symbol.
 * @returns {object|undefined} Binding record.
 */
function binding(analysis, key, symbol)
{
    return analysis.stages
        .find((stage) => stage.key === key)
        ?.bindings.find((entry) => entry.generatedSymbol === symbol);
}

test("the container-derived analysis is identical to the source-derived analysis", () =>
{
    const bytes = writeEffectFile();

    const differences = diffPaths(analysisFromSource(bytes), analysisFromContainer(bytes));
    assert.deepEqual(differences, [], `analysis documents diverge:\n${differences.join("\n")}`);

    // The bodies are genuinely distinct, so the agreement above is a real
    // comparison rather than four copies of one body agreeing with themselves.
    const reference = analysisFromSource(bytes);
    for (let index = 0; index < 4; index += 1)
    {
        const other = analysisFromContainer(bytes, {}, index);
        const differs = diffPaths(reference, other).length > 0;
        assert.equal(
            differs,
            index !== lastSourceSelection.bodyIndex,
            `body ${index} must differ from the selected body unless it is the selected body`
        );
    }
});

test("the diff would catch a field-copying adapter", () =>
{
    // The negative control. Every check in this phase carries one, because a
    // guard that has only ever passed is indistinguishable from a guard that
    // cannot fail. Here the three silent conversions are each reverted in turn
    // and the diff must name the field.
    const bytes = writeEffectFile();
    const reference = analysisFromSource(bytes);

    const reader = new CjsCarbonEffectReader(bytes, { source: SOURCE });
    const description = reader.readDescription(0);
    const stageData = description.techniques[0].passes[0].stages[0];

    // 1. The rename: the wire calls it `count`, the runtime calls it
    //    `arrayElements`. A copying adapter yields `undefined`.
    const renamed = runtimeDescriptionFromCarbon(description, { effectName: SOURCE });
    for (const texture of renamed.techniques[0].passes[0].stageInputs[0].resources.values())
    {
        delete texture.arrayElements;
    }
    const renamedAnalysis = buildEffectAnalysis({
        effectDescription: renamed,
        bindingManifest: HlslEffectBindingManifest.fromEffectDescription(renamed, { effectName: SOURCE }),
        effectRes: { sourcePath: SOURCE, m_compilerVersion: null },
        selection: { bodyIndex: 0, selectedOptions: [] }
    }, { source: SOURCE, decodeBytecode: false });
    assert.ok(
        diffPaths(reference, renamedAnalysis).some((entry) => entry.includes("arrayElements")),
        "a missing arrayElements must be reported"
    );

    // 2. The type difference: `isSRGB` as the wire's 0/1 rather than a boolean.
    //    Accidentally correct in every behavioural sense, so only this diff sees it.
    assert.ok(
        stageData.textures.some((texture) => texture.isSRGB === 1),
        "the fixture must carry an sRGB texture for this control to mean anything"
    );
    const untyped = runtimeDescriptionFromCarbon(description, { effectName: SOURCE });
    for (const texture of untyped.techniques[0].passes[0].stageInputs[0].resources.values())
    {
        texture.isSRGB = texture.isSRGB ? 1 : 0;
    }
    const untypedAnalysis = buildEffectAnalysis({
        effectDescription: untyped,
        bindingManifest: HlslEffectBindingManifest.fromEffectDescription(untyped, { effectName: SOURCE }),
        effectRes: { sourcePath: SOURCE, m_compilerVersion: null },
        selection: { bodyIndex: 0, selectedOptions: [] }
    }, { source: SOURCE, decodeBytecode: false });
    assert.ok(
        diffPaths(reference, untypedAnalysis).some((entry) => entry.includes("isSRGB")),
        "isSRGB as an integer must be reported even though it is falsy/truthy correct"
    );
});

test("the closed mapping table rejects a wire field it has no rule for", () =>
{
    // The table's whole purpose: an unmapped key becomes an error at construction
    // rather than `undefined` in the engine months later. Three instances of that
    // failure class arrived by three unrelated routes, so enumerating traps was
    // abandoned in favour of failing closed.
    const bytes = writeEffectFile();
    const description = new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0);
    description.techniques[0].passes[0].stages[0].textures[0].newWireField = 1;

    assert.throws(
        () => runtimeDescriptionFromCarbon(description, { effectName: SOURCE }),
        /texture record carries field "newWireField" with no mapping rule/
    );
});

test("a UAV's isSRGB is synthesised, because the wire record does not carry it", () =>
{
    // A UAV record is one byte shorter than a texture record. Both kinds share
    // HlslEffectResource, so `metadata.toJSON()` emits `isSRGB` for a UAV even
    // though nothing on the wire supplies it; Carbon hardcodes it false.
    const bytes = writeEffectFile();
    const description = new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0);
    assert.ok(
        !Object.prototype.hasOwnProperty.call(
            description.techniques[0].passes[0].stages[0].uavs[0],
            "isSRGB"
        ),
        "the wire UAV record must not carry isSRGB"
    );

    const rebuilt = runtimeDescriptionFromCarbon(description, { effectName: SOURCE });
    const uav = rebuilt.techniques[0].passes[0].stageInputs[0].uavs.get(2);
    assert.equal(uav.isSRGB, false);
    assert.equal(uav.arrayElements, 1, "count is the wire's name for arrayElements");
});

test("a non-dynamic sampler's name is restored as null, not the empty string", () =>
{
    // Carbon nulls a non-dynamic sampler's name before any consumer sees it, so
    // our producer writes the empty string. Restoring "" would be accidentally
    // correct — both are falsy — and would survive every behavioural test.
    const bytes = writeEffectFile((index) =>
    {
        const description = describeWithoutLibraries({ label: `Body${index}` });
        for (const technique of description.techniques)
        {
            for (const pass of technique.passes)
            {
                for (const stage of pass.stages)
                {
                    for (const sampler of stage.samplers)
                    {
                        sampler.isDynamic = 0;
                        sampler.name = str("");
                    }
                }
            }
        }
        return description;
    });

    const differences = diffPaths(analysisFromSource(bytes), analysisFromContainer(bytes));
    assert.deepEqual(differences, [], `analysis documents diverge:\n${differences.join("\n")}`);

    const rebuilt = runtimeDescriptionFromCarbon(
        new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0),
        { effectName: SOURCE }
    );
    assert.equal(rebuilt.techniques[0].passes[0].stageInputs[0].samplers.get(0).name, null);
});

test("both carbonPayload constructions survive the round trip", () =>
{
    // `carbonPayload` has two entirely different constructions and conflating
    // them is the trap. The constantBuffer branch is fully synthesised — nothing
    // is copied from metadata — while every other kind is a wholesale
    // `metadata.toJSON()`. Each is asserted the way it fails.
    const bytes = writeEffectFile();
    const source = analysisFromSource(bytes);
    const container = analysisFromContainer(bytes);

    // The synthesised path. `hasLocalConstants: undefined` from a copying
    // adapter reaches packMaterial's fail-closed branch only when something
    // draws, so nothing in the read chain would catch it.
    const sourceCb = binding(source, "Main.pass0.pixel", "cb0");
    const containerCb = binding(container, "Main.pass0.pixel", "cb0");
    assert.ok(sourceCb, "the fixture must carry a Main.pass0.pixel cb0 binding");
    assert.equal(containerCb.carbon.hasLocalConstants, true);
    assert.equal(containerCb.carbon.hasLocalConstants, sourceCb.carbon.hasLocalConstants);
    assert.equal(containerCb.carbon.constantValueSize, sourceCb.carbon.constantValueSize);
    assert.ok(containerCb.carbon.constants.length > 0, "cb0 must carry its local constants");
    for (const field of [ "name", "offset", "size", "dimension", "type", "elements" ])
    {
        assert.ok(
            containerCb.carbon.constants.every((entry) => entry[field] !== undefined),
            `every constant record must carry ${field}`
        );
    }
    assert.deepEqual(containerCb.carbon.constants, sourceCb.carbon.constants);

    // The passthrough path, diffed as a whole object rather than field by field.
    // A field-list adapter looks correct exactly here: it reproduces whatever the
    // engine reads today and silently drops anything it starts reading later.
    const sourceTexture = binding(source, "Main.pass0.pixel", "t0");
    const containerTexture = binding(container, "Main.pass0.pixel", "t0");
    assert.ok(sourceTexture, "the fixture must carry a Main.pass0.pixel t0 binding");
    assert.deepEqual(containerTexture.carbon, sourceTexture.carbon);
    assert.equal(containerTexture.carbon.isSRGB, true, "isSRGB must be boolean, not 1");
});

test("the constant value size is re-clamped rather than copied", () =>
{
    // The clamp is corpus-scale, not fixture-scale: an effect above 4096 bytes of
    // constants gets a wrong-size ArrayBuffer from packMaterial if the adapter
    // restores the unclamped declared size. The fixture cannot reach it
    // naturally, so it is forced here.
    const oversize = 5000;
    const bytes = writeEffectFile((index) =>
    {
        const description = describeWithoutLibraries({ label: `Body${index}` });
        for (const technique of description.techniques)
        {
            for (const pass of technique.passes)
            {
                for (const stage of pass.stages)
                {
                    stage.defaultValues = {
                        size: oversize,
                        offset: 0,
                        bytes: new Uint8Array(oversize)
                    };
                }
            }
        }
        return description;
    });

    const rebuilt = runtimeDescriptionFromCarbon(
        new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0),
        { effectName: SOURCE }
    );
    const stage = rebuilt.techniques[0].passes[0].stageInputs[0];
    assert.equal(stage.m_constantValueSize, 4096, "the declared size must be re-clamped");
    assert.equal(stage.constantValues.length, 4096);
    assert.equal(stage.sourceConstantValues.length, oversize, "the source bytes stay unclamped");

    // And it still agrees with the reader that owns the clamp.
    const differences = diffPaths(analysisFromSource(bytes), analysisFromContainer(bytes));
    assert.deepEqual(differences, [], `analysis documents diverge:\n${differences.join("\n")}`);
});

test("raytracing libraries are refused rather than dropped", () =>
{
    // Nothing in the binding manifest reads libraries, so skipping them would
    // produce a correct-looking analysis. Stated as an error so the limitation
    // announces itself if it ever stops being true.
    const bytes = writeEffectFile(() => buildSyntheticDescription());
    const description = new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0);

    assert.throws(
        () => runtimeDescriptionFromCarbon(description, { effectName: SOURCE }),
        /declares raytracing libraries, which the runtime adapter does not rebuild/
    );
});

test("a pass declaring one stage type twice is rejected", () =>
{
    // Carbon assigns into stageInputs[type], so a repeated type silently
    // clobbers the earlier stage and the shader handles then disagree with the
    // stage count. Last-wins, no error — the same failure class as the index
    // clobber already on record.
    const bytes = writeEffectFile();
    const description = new CjsCarbonEffectReader(bytes, { source: SOURCE }).readDescription(0);
    const pass = description.techniques[0].passes[0];
    pass.stages[1].type = pass.stages[0].type;

    assert.throws(
        () => runtimeDescriptionFromCarbon(description, { effectName: SOURCE }),
        /declares stage type 0 twice/
    );
});
