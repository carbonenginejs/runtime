import test from "node:test";
import assert from "node:assert/strict";

import { CjsByteWriter } from "../../../../src/resource/format/CjsByteWriter.js";
import { CjsByteReader } from "../../../../src/resource/format/CjsByteReader.js";
import { CjsStringTable } from "../../../../src/resource/format/CjsStringTable.js";
import {
    collectArena,
    internArena,
    passthroughArena,
    readEffectDescription,
    writeEffectDescription
} from "../../../../src/resource/format/carbonEffect/carbonEffectRecords.js";
import {
    DETAIL_MAP_ARRAY_DEFAULTS,
    readBackendBlock,
    writeBackendBlock
} from "../../../../src/resource/format/carbonEffect/carbonEffectBackendBlock.js";
import {
    CARBON_BACKEND_ENGINE_ID,
    peekBackendEngineId
} from "../../../../src/resource/format/carbonEffect/backendEngineId.js";
import { CjsCarbonEffectReader } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { buildSyntheticDescription, SYNTHETIC_PERMUTATIONS } from "./carbonEffectSynthetic.js";

/**
 * A pass's backend block covering both sections and every optional field.
 *
 * @returns {object} Block contents.
 */
function sampleBlock()
{
    return {
        bindGroups: [ {
            group: 0,
            bindings: [
                {
                    group: 0,
                    binding: 0,
                    resourceKind: "uniform-buffer",
                    registerSpace: 0,
                    registerIndex: 0,
                    visibility: [ "vertex" ],
                    type: "array<vec4<f32>, 32>",
                    generatedSymbol: "cb0"
                },
                {
                    group: 0,
                    binding: 1,
                    resourceKind: "sampled-resource",
                    registerSpace: 0,
                    registerIndex: 11,
                    visibility: [ "fragment" ],
                    type: "texture_2d_array<f32>",
                    generatedSymbol: "t11",
                    arrayLayerCount: 3,
                    transformId: "Main.pass0:detail-map-array:sampled-resource:0:11"
                },
                {
                    group: 0,
                    binding: 2,
                    resourceKind: "storage-resource",
                    registerSpace: 2,
                    registerIndex: 4,
                    visibility: [ "vertex", "fragment", "compute" ],
                    type: "array<u32>",
                    generatedSymbol: "u4_space2",
                    structureStride: 48
                }
            ]
        } ],
        transforms: [ {
            id: "Main.pass0:detail-map-array:sampled-resource:0:11",
            family: "detail-map-array",
            inputs: [
                { parameter: "Detail1Map", registerSpace: 0, registerIndex: 11 },
                { parameter: "Detail2Map", registerSpace: 0, registerIndex: 12 },
                { parameter: "Detail3Map", registerSpace: 0, registerIndex: 13 }
            ]
        } ]
    };
}

test("a backend block round-trips every stored field", () =>
{
    const parsed = readBackendBlock(writeBackendBlock(sampleBlock()), { layoutKey: "Main.pass0" });

    assert.equal(parsed.trailingBytes, 0);
    assert.equal(parsed.bindGroups.length, 1);

    const bindings = parsed.bindGroups[0].bindings;
    assert.equal(bindings.length, 3);
    assert.deepEqual(bindings[0].visibility, [ "vertex" ]);
    assert.equal(bindings[0].type, "array<vec4<f32>, 32>");
    assert.equal(bindings[0].generatedSymbol, "cb0");
    assert.equal("structureStride" in bindings[0], false);
    assert.equal("arrayLayerCount" in bindings[0], false);
    assert.equal("transformId" in bindings[0], false);

    assert.equal(bindings[1].arrayLayerCount, 3);
    assert.equal(bindings[1].transformId, "Main.pass0:detail-map-array:sampled-resource:0:11");
    assert.equal(bindings[2].structureStride, 48);
    assert.deepEqual(bindings[2].visibility, [ "vertex", "fragment", "compute" ]);
});

test("derived binding fields are restored, not stored", () =>
{
    const parsed = readBackendBlock(writeBackendBlock(sampleBlock()), { layoutKey: "Main.pass0" });
    const [ uniform, texture ] = parsed.bindGroups[0].bindings;

    assert.equal(uniform.identity, "uniform-buffer:0:0");
    assert.equal(uniform.scopeIdentity, "uniform-buffer:0:0@vertex");
    assert.equal(texture.identity, "sampled-resource:0:11");
    assert.equal(texture.scopeIdentity, "sampled-resource:0:11@fragment");
    assert.equal(uniform.group, 0);
});

test("a transform restores every derived field from the family discriminator", () =>
{
    const parsed = readBackendBlock(writeBackendBlock(sampleBlock()), { layoutKey: "Main.pass0" });
    const transform = parsed.transforms[0];

    // Kept on the wire: id, family, and each input's parameter plus space:register.
    assert.equal(transform.id, "Main.pass0:detail-map-array:sampled-resource:0:11");
    assert.equal(transform.family, "detail-map-array");
    assert.deepEqual(
        transform.inputs.map((input) => input.parameter),
        [ "Detail1Map", "Detail2Map", "Detail3Map" ]
    );

    // Restored from the family, not stored.
    assert.equal(transform.version, DETAIL_MAP_ARRAY_DEFAULTS.version);
    assert.equal(transform.kind, "texture-2d-array");
    assert.equal(transform.stage, "fragment");
    assert.equal(transform.representation, "native-or-rgba8");
    assert.equal(transform.missingLayer, "reject");
    assert.equal(transform.output.name, "DetailArrayMap");
    assert.equal(transform.output.viewDimension, "2d-array");

    // Restored from position and count.
    assert.deepEqual(transform.inputs.map((input) => input.layer), [ 0, 1, 2 ]);
    assert.equal(transform.output.layerCount, 3);
    assert.equal(transform.inputs[0].identity, "sampled-resource:0:11");
    assert.equal(transform.inputs[0].scopeIdentity, "sampled-resource:0:11@fragment");
    assert.equal(transform.output.identity, transform.inputs[0].identity);
    assert.equal(transform.output.scopeIdentity, transform.inputs[0].scopeIdentity);

    // Restored from the enclosing pass.
    assert.equal(transform.layoutKey, "Main.pass0");
});

test("a transform that disagrees with its family is refused, not silently rewritten", () =>
{
    // Every field the previous test calls "restored from the family" is dropped
    // on write. A document that sets one to something else does not fail on its
    // own - it round-trips into a different document. That is the shape behind
    // both the selectedOptions and register-pair bugs, so the writer refuses it
    // at the producing site instead.
    const disagreements = [
        [ "stage", { stage: "vertex" } ],
        [ "kind", { kind: "texture-2d" } ],
        [ "version", { version: 2 } ],
        [ "representation", { representation: "rgba8" } ],
        [ "missingLayer", { missingLayer: "ignore" } ],
        [ "output.name", { output: { name: "SomethingElse" } } ],
        [ "output.viewDimension", { output: { viewDimension: "2d" } } ],
        [ "output.layerCount", { output: { layerCount: 7 } } ]
    ];

    for (const [ label, patch ] of disagreements)
    {
        const block = sampleBlock();
        const transform = block.transforms[0];

        block.transforms = [ { ...transform, ...patch, output: { ...transform.output, ...patch.output } } ];

        assert.throws(
            () => writeBackendBlock(block),
            (error) => error.message.includes("silently change the document")
                || error.message.includes("output layers"),
            `writing a transform with a conflicting ${label} must throw`
        );
    }

    // Negative control: the unmodified block still writes. Without this, a
    // writer that threw on everything would pass the loop above.
    assert.ok(writeBackendBlock(sampleBlock()).byteLength > 0);

    // Omitting a restored field is not a disagreement - it is how a caller says
    // "use the family value", and it must still round-trip.
    const sparse = sampleBlock();
    const { stage, representation, ...rest } = sparse.transforms[0];

    sparse.transforms = [ rest ];
    assert.equal(readBackendBlock(writeBackendBlock(sparse), { layoutKey: "Main.pass0" }).transforms[0].stage, "fragment");
});

test("a binding whose derived fields disagree is refused, including visibility order", () =>
{
    const withBinding = (patch) =>
    {
        const block = sampleBlock();
        const [ first ] = block.bindGroups[0].bindings;

        block.bindGroups[0].bindings = [ { ...first, ...patch } ];
        return block;
    };

    // identity and group are derived from stored data, so a disagreeing value
    // is a producer bug the round trip would otherwise hide.
    assert.throws(() => writeBackendBlock(withBinding({ identity: "uniform-buffer:9:9" })), /silently/);
    assert.throws(() => writeBackendBlock(withBinding({ group: 3 })), /silently/);

    // The sharp one: visibility is stored as a bitmask, so it is a set, while
    // scopeIdentity is derived from visibility[0], which is an order. Written
    // as [fragment, vertex] this binding reads back [vertex, fragment] and its
    // scope moves from @fragment to @vertex - a wrong package that loads.
    assert.throws(
        () => writeBackendBlock(withBinding({
            visibility: [ "fragment", "vertex" ],
            scopeIdentity: "uniform-buffer:0:0@fragment"
        })),
        /silently/,
        "non-canonical visibility order must be refused, not quietly reordered"
    );

    // Canonical order carrying the matching scope is accepted, so the check
    // above is about disagreement rather than about rejecting every binding.
    assert.ok(writeBackendBlock(withBinding({
        visibility: [ "vertex", "fragment" ],
        scopeIdentity: "uniform-buffer:0:0@vertex"
    })).byteLength > 0);

    // Omitting the derived fields entirely remains the normal path.
    assert.ok(writeBackendBlock(sampleBlock()).byteLength > 0);
});

test("the block carries no arena offsets, so it can live inside the arena", () =>
{
    // The whole point of the self-contained encoding: interning the block cannot
    // shift offsets the block itself depends on, because it has none. Proven by
    // the block being byte-identical regardless of the arena it is interned into.
    const block = writeBackendBlock(sampleBlock());

    const sparse = new CjsStringTable();
    const reference = sparse.addBytes(block);
    sparse.finish();

    const crowded = new CjsStringTable();
    // Filler that sorts before the block, so the block's own offset moves.
    for (let index = 0; index < 50; index += 1) crowded.addBytes(Uint8Array.of(0, index));
    const crowdedReference = crowded.addBytes(block);
    crowded.finish();

    assert.equal(sparse.offsetOf(reference), 0);
    assert.ok(crowded.offsetOf(crowdedReference) > 0);
    assert.deepEqual(
        Array.from(sparse.bytesOf(reference)),
        Array.from(crowded.bytesOf(crowdedReference))
    );
});

test("identical blocks dedupe in the arena the way program source does", () =>
{
    const table = new CjsStringTable();
    const first = table.addBytes(writeBackendBlock(sampleBlock()));
    const second = table.addBytes(writeBackendBlock(sampleBlock()));
    assert.equal(first, second);
    assert.equal(table.entryCount, 1);
});

test("a block with a trailing tail is rejected, not silently truncated", () =>
{
    // A newer writer added a field. With no version byte this is the ONLY signal
    // that a block came from a different build, so the check is load-bearing:
    // discarding the tail would parse clean and lose data.
    const bytes = writeBackendBlock(sampleBlock());
    const padded = new Uint8Array(bytes.length + 3);
    padded.set(bytes, 0);

    assert.throws(
        () => readBackendBlock(padded),
        /Backend block has 3 unparsed trailing byte\(s\); rebuild the effect package/
    );

    // And the exact-length case still reports a clean landing.
    assert.equal(readBackendBlock(bytes).trailingBytes, 0);
});

test("the leading byte identifies the target engine, and a mismatch is fatal", () =>
{
    // This byte was once called a version and emitted 1, while the WebGL2 block
    // also emitted 1 meaning something unrelated - so it could not do its one
    // job. It is an engine identifier: parsing a WebGL2 block as WebGPU must
    // fail loudly rather than misread structurally valid bytes.
    const bytes = Uint8Array.from(writeBackendBlock(sampleBlock()));
    assert.equal(bytes[0], CARBON_BACKEND_ENGINE_ID.webgpu);

    bytes[0] = CARBON_BACKEND_ENGINE_ID.webgl2;
    assert.throws(() => readBackendBlock(bytes), /declares type 1 \(webgl2\) but was parsed as webgpu/u);

    // Zero-filled or truncated data must never read as a valid backend.
    bytes[0] = CARBON_BACKEND_ENGINE_ID.invalid;
    assert.throws(() => readBackendBlock(bytes), /invalid/u);
});

test("the block rejects values outside its enums", () =>
{
    assert.throws(
        () => writeBackendBlock({
            bindGroups: [ { group: 0, bindings: [ { resourceKind: "invented", registerSpace: 0, registerIndex: 0, binding: 0, visibility: [], type: "x", generatedSymbol: "x" } ] } ]
        }),
        /Unknown resource kind "invented"/
    );
    assert.throws(
        () => writeBackendBlock({
            bindGroups: [ { group: 0, bindings: [ { resourceKind: "sampler", registerSpace: 0, registerIndex: 0, binding: 0, visibility: [ "geometry" ], type: "sampler", generatedSymbol: "s0" } ] } ]
        }),
        /Unknown binding visibility "geometry"/
    );
    assert.throws(
        () => writeBackendBlock({ transforms: [ { id: "x", family: "invented", inputs: [] } ] }),
        /Unknown transform family "invented"/
    );
});

test("a description with backend blocks round-trips byte-exactly", () =>
{
    const table = new CjsStringTable();
    const description = buildSyntheticDescription();
    const block = writeBackendBlock(sampleBlock());
    for (const technique of description.techniques)
    {
        for (const pass of technique.passes)
        {
            pass.backendBlock = { size: block.length, offset: 0, bytes: block };
        }
    }

    // Two passes, as the container writer does: intern everything, then emit.
    writeEffectDescription(new CjsByteWriter(), description, {
        arena: collectArena(table),
        backend: true
    });
    table.finish();

    const first = new CjsByteWriter();
    writeEffectDescription(first, description, { arena: internArena(table), backend: true });
    const bytes = first.toBytes();

    const reader = new CjsByteReader(bytes, {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    const parsed = readEffectDescription(reader, { backend: true });

    const second = new CjsByteWriter();
    writeEffectDescription(second, parsed, { arena: passthroughArena, backend: true });
    assert.deepEqual(Array.from(second.toBytes()), Array.from(bytes));

    // The block reference resolved to the interned bytes, and every pass shares it.
    const resolved = parsed.techniques[0].passes[0].backendBlock;
    assert.equal(resolved.size, block.length);
    assert.deepEqual(Array.from(resolved.bytes), Array.from(block));
    assert.equal(parsed.techniques[1].passes[0].backendBlock.offset, resolved.offset);
});

test("the backend gate off produces exactly Carbon's bytes", () =>
{
    // The gate is what keeps the real-file corpus proof valid: with it closed a
    // pass ends at the render-state table, as every shipped file does.
    const description = buildSyntheticDescription();

    const carbon = new CjsByteWriter();
    writeEffectDescription(carbon, description, { arena: passthroughArena });

    const withBlock = new CjsByteWriter();
    writeEffectDescription(withBlock, description, { arena: passthroughArena, backend: true });

    const carbonBytes = carbon.toBytes();
    const blockBytes = withBlock.toBytes();

    const passCount = description.techniques
        .reduce((total, technique) => total + technique.passes.length, 0);
    assert.equal(passCount, 3);
    // Eight bytes of {size, offset} per pass, and not one byte anywhere else.
    assert.equal(blockBytes.length - carbonBytes.length, passCount * 8);

    // And a Carbon-gated read of Carbon-gated bytes sees no block at all.
    const table = new CjsStringTable();
    writeEffectDescription(new CjsByteWriter(), description, { arena: collectArena(table) });
    table.finish();
    const interned = new CjsByteWriter();
    writeEffectDescription(interned, description, { arena: internArena(table) });
    const reader = new CjsByteReader(interned.toBytes(), {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    const parsed = readEffectDescription(reader);
    assert.equal("backendBlock" in parsed.techniques[0].passes[0], false);
});

test("the container reader honours the backend gate", () =>
{
    // The gate has to be reachable from the container, not just from the record
    // codec: `CjsCarbonEffectReader.readDescription` accepted no options at all
    // for three commits, so a backend-bearing container could be written and
    // never read back. Nothing caught it because every test that exercised the
    // gate called `readEffectDescription` directly.
    const block = writeBackendBlock(sampleBlock());
    const description = buildSyntheticDescription();
    for (const technique of description.techniques)
    {
        for (const pass of technique.passes)
        {
            pass.backendBlock = { size: block.length, offset: 0, bytes: block };
        }
    }

    const writer = new CjsCarbonEffectWriter({ backend: true });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    for (let index = 0; index < 4; index += 1) writer.addBody(index, description);

    const reader = new CjsCarbonEffectReader(writer.toBytes(), { source: "backend gate" });
    const parsed = reader.readDescription(0, { backend: true });
    const resolved = parsed.techniques[0].passes[0].backendBlock;

    assert.equal(resolved.size, block.length);
    assert.deepEqual(Array.from(resolved.bytes), Array.from(block));
    const decoded = readBackendBlock(resolved.bytes);
    assert.equal(decoded.bindGroups.length, sampleBlock().bindGroups.length);
    assert.deepEqual(
        decoded.bindGroups[0].bindings.map((binding) => binding.generatedSymbol),
        sampleBlock().bindGroups[0].bindings.map((binding) => binding.generatedSymbol)
    );

    // Negative control: the same bytes read with the gate explicitly closed must
    // fail. If this succeeded, honouring the option would be unobservable and the
    // test would pass just as happily against the defect it was written for.
    //
    // `{ backend: false }` rather than a bare call, and the difference is not
    // cosmetic. Omitting the option used to mean "gate closed"; it now means
    // "detect from the blob's declared end", which is what replaced the envelope.
    // A bare call therefore succeeds, and using it here would silently retire this
    // control -- the exact way a check stops being able to fail.
    assert.throws(
        () => reader.readDescription(0, { backend: false }),
        /trailing byte|Invalid string-table offset|beyond|exceeds/iu
    );

    // And detection reaches the same answer as being told, which is the property
    // that lets the container carry no envelope, no payload tag and no version.
    assert.deepEqual(
        reader.readDescription(0).techniques[0].passes[0].backendBlock.bytes,
        resolved.bytes
    );
});

test("a foreign engine id is absent data at the container, not a failed load", () =>
{
    // Loading must never depend on being able to USE a backend block. CCP's own
    // dx11, dx12 and metal containers are Carbon-shaped and carry no block at
    // all, and they must load here even though nothing in this library can
    // execute their programs. A sibling backend's block is the same case: not
    // for this engine, not corrupt.
    //
    // So the container peeks and skips; only a caller that has committed to
    // parsing a specific backend gets the hard error.
    const bytes = Uint8Array.from(writeBackendBlock(sampleBlock()));

    assert.equal(peekBackendEngineId(bytes), CARBON_BACKEND_ENGINE_ID.webgpu);

    bytes[0] = CARBON_BACKEND_ENGINE_ID.webgl2;
    assert.equal(peekBackendEngineId(bytes), CARBON_BACKEND_ENGINE_ID.webgl2);
    assert.notEqual(peekBackendEngineId(bytes), CARBON_BACKEND_ENGINE_ID.webgpu);

    // An empty or truncated block never reads as a usable backend.
    assert.equal(peekBackendEngineId(new Uint8Array(0)), CARBON_BACKEND_ENGINE_ID.invalid);
    assert.equal(peekBackendEngineId(null), CARBON_BACKEND_ENGINE_ID.invalid);
});
