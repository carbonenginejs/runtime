import test from "node:test";
import assert from "node:assert/strict";

import { CjsByteWriter } from "../../src/format/CjsByteWriter.js";
import { CjsByteReader } from "../../src/format/CjsByteReader.js";
import { CjsStringTable } from "../../src/format/CjsStringTable.js";
import {
    collectArena,
    internArena,
    passthroughArena,
    readEffectDescription,
    writeEffectDescription
} from "../../src/format/carbonEffect/carbonEffectRecords.js";
import {
    CARBON_EFFECT_BACKEND_BLOCK_VERSION,
    DETAIL_MAP_ARRAY_DEFAULTS,
    readBackendBlock,
    writeBackendBlock
} from "../../src/format/carbonEffect/carbonEffectBackendBlock.js";
import { CjsCarbonEffectReader } from "../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
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

    assert.equal(parsed.version, CARBON_EFFECT_BACKEND_BLOCK_VERSION);
    assert.equal(parsed.unsupported, false);
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

test("a same-version block with a trailing tail is rejected, not silently truncated", () =>
{
    // Version skew without a version bump: a newer writer added a field and did
    // not raise blobVersion. Discarding the tail would parse clean and lose data.
    const bytes = writeBackendBlock(sampleBlock());
    const padded = new Uint8Array(bytes.length + 3);
    padded.set(bytes, 0);

    assert.throws(
        () => readBackendBlock(padded),
        /Backend block has 3 unparsed trailing byte\(s\) at version 1/
    );

    // And the exact-length case still reports a clean landing.
    assert.equal(readBackendBlock(bytes).trailingBytes, 0);
});

test("a newer block version is skipped rather than misparsed", () =>
{
    const bytes = Uint8Array.from(writeBackendBlock(sampleBlock()));
    bytes[0] = CARBON_EFFECT_BACKEND_BLOCK_VERSION + 1;

    const parsed = readBackendBlock(bytes);
    assert.equal(parsed.unsupported, true);
    assert.deepEqual(parsed.bindGroups, []);
    assert.deepEqual(parsed.transforms, []);
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
