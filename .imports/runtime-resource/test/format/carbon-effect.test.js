import test from "node:test";
import assert from "node:assert/strict";

import { CjsByteWriter } from "../../src/format/CjsByteWriter.js";
import { CjsByteReader } from "../../src/format/CjsByteReader.js";
import { CjsStringTable } from "../../src/format/CjsStringTable.js";
import {
    CARBON_EFFECT_DATA_VERSION,
    CARBON_EFFECT_COUNT_CAPS,
    collectArena,
    compareAnnotationNames,
    internArena,
    passthroughArena,
    readEffectDescription,
    writeEffectDescription
} from "../../src/format/carbonEffect/carbonEffectRecords.js";
import {
    CjsCarbonEffectReader,
    CARBON_EFFECT_SOURCE_HASH_BYTES
} from "../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import {
    CjsCarbonEffectWriter,
    writeCarbonEffectFile
} from "../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
import {
    buildSyntheticDescription,
    SYNTHETIC_PERMUTATIONS,
    blob,
    str,
    stage
} from "./carbonEffectSynthetic.js";

const COMPILER_VERSION = [ 1, 2, 6, 0 ];
const SOURCE_HASH = "0123456789abcdef0123456789abcdef";

/**
 * Builds the synthetic four-permutation container. Permutations 2 and 3 share a
 * body so the alias path is exercised.
 *
 * @returns {Uint8Array} Container bytes.
 */
function buildSyntheticContainer()
{
    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    writer.addBody(0, buildSyntheticDescription({ label: "A" }));
    writer.addBody(1, buildSyntheticDescription({ label: "B" }));
    writer.addBody(2, buildSyntheticDescription({ label: "C" }));
    writer.addBody(3, buildSyntheticDescription({ label: "C" }));
    return writer.toBytes();
}

test("synthetic v15 container reads back with the header it was written with", () =>
{
    const reader = new CjsCarbonEffectReader(buildSyntheticContainer(), { source: "synthetic" });

    assert.equal(reader.version, CARBON_EFFECT_DATA_VERSION);
    assert.deepEqual(reader.compilerVersion, COMPILER_VERSION);
    assert.equal(new TextDecoder().decode(reader.sourceHash), SOURCE_HASH);
    assert.equal(reader.sourceHash.length, CARBON_EFFECT_SOURCE_HASH_BYTES);

    assert.equal(reader.permutations.length, 2);
    assert.equal(reader.permutations[0].name.value, "SKINNED");
    assert.equal(reader.permutations[0].defaultOption, 0);
    assert.equal(reader.permutations[0].description.value, "Skinned geometry");
    assert.equal(reader.permutations[0].type, 1);
    assert.deepEqual(reader.permutations[0].options.map((option) => option.value), [ "0", "1" ]);
    assert.equal(reader.permutations[1].name.value, "DETAIL");
    assert.equal(reader.permutations[1].defaultOption, 1);

    assert.equal(reader.permutationProduct, 4);
    assert.equal(reader.records.length, 4);
    assert.deepEqual(reader.records.map((record) => record.index), [ 0, 1, 2, 3 ]);
});

test("synthetic v15 container is dense, positionally indexed, and aliases identical bodies", () =>
{
    const reader = new CjsCarbonEffectReader(buildSyntheticContainer());

    assert.equal(reader.diagnostics.dense, true);
    assert.equal(reader.diagnostics.indicesMatchPosition, true);
    assert.equal(reader.diagnostics.uniqueBodyCount, 3);
    assert.equal(reader.diagnostics.aliasedRowCount, 1);

    // Carbon points a duplicate's row at the surviving twin rather than dropping
    // the row, so the table stays dense for positional lookup.
    assert.equal(reader.records[2].offset, reader.records[3].offset);
    assert.equal(reader.records[2].size, reader.records[3].size);

    reader.requireDensePermutationTable();
});

test("every body region lies after the header and inside the file, with no slack", () =>
{
    const bytes = buildSyntheticContainer();
    const reader = new CjsCarbonEffectReader(bytes);

    const offsets = reader.records.map((record) => record.offset);
    assert.equal(Math.min(...offsets), reader.headerEnd);
    assert.equal(Math.max(...reader.records.map((record) => record.offset + record.size)), bytes.length);
});

test("a description round-trips byte-exactly through the source arena", () =>
{
    const bytes = buildSyntheticContainer();
    const reader = new CjsCarbonEffectReader(bytes);

    for (let index = 0; index < reader.records.length; index += 1)
    {
        const description = reader.readDescription(index);
        const writer = new CjsByteWriter();
        writeEffectDescription(writer, description, { arena: passthroughArena });
        assert.deepEqual(
            Array.from(writer.toBytes()),
            Array.from(reader.bodyBytes(index)),
            `body ${index} did not re-emit byte-exactly`
        );
    }
});

test("a whole container round-trips byte-exactly through a rebuilt arena", () =>
{
    const original = buildSyntheticContainer();
    const reader = new CjsCarbonEffectReader(original);

    const rebuilt = new CjsCarbonEffectWriter({
        compilerVersion: reader.compilerVersion,
        sourceHash: reader.sourceHash
    });
    for (const axis of reader.permutations)
    {
        rebuilt.addPermutation({
            name: axis.name.value,
            defaultOption: axis.defaultOption,
            description: axis.description.value,
            type: axis.type,
            options: axis.options.map((option) => option.value)
        });
    }
    for (let index = 0; index < reader.records.length; index += 1)
    {
        rebuilt.addBody(index, reader.readDescription(index));
    }

    assert.deepEqual(Array.from(rebuilt.toBytes()), Array.from(original));
});

test("a container re-emitted from raw bodies and the source arena is byte-identical", () =>
{
    const original = buildSyntheticContainer();
    const reader = new CjsCarbonEffectReader(original);

    const permutationRows = reader.permutations.map((axis) => ({
        name: axis.name.value,
        nameOffset: axis.name.offset,
        defaultOption: axis.defaultOption,
        descriptionOffset: axis.description.offset,
        type: axis.type,
        options: axis.options.map((option) => option.offset)
    }));
    const bodies = reader.records.map((record, index) => ({
        index,
        bytes: reader.bodyBytes(index)
    }));

    const reemitted = writeCarbonEffectFile({
        compilerVersion: reader.compilerVersion,
        sourceHash: reader.sourceHash,
        stringTableBytes: reader.stringTableBytes,
        permutationRows,
        bodies
    });

    assert.deepEqual(Array.from(reemitted), Array.from(original));
});

test("the arena shares identical program payloads across bodies", () =>
{
    const reader = new CjsCarbonEffectReader(buildSyntheticContainer());
    const first = reader.readDescription(0);
    const vertex = first.techniques[0].passes[0].stages[0];
    const raytraceVertex = first.techniques[1].passes[0].stages[0];

    // Both stages carry the same five program bytes, so the arena holds one copy
    // and both references point at it.
    assert.deepEqual(Array.from(vertex.shaderData.bytes), Array.from(raytraceVertex.shaderData.bytes));
    assert.equal(vertex.shaderData.offset, raytraceVertex.shaderData.offset);
});

test("a zero-size default-value blob keeps Carbon's null reference", () =>
{
    const reader = new CjsCarbonEffectReader(buildSyntheticContainer());
    const description = reader.readDescription(0);
    const local = description.techniques[1].libraries[0].localInputs;

    assert.equal(local.defaultValues.size, 0);
    assert.equal(local.defaultValues.offset, 0xffffffff);
    assert.equal(local.defaultValues.bytes.length, 0);
});

test("annotation values survive as raw bytes rather than being reinterpreted", () =>
{
    const reader = new CjsCarbonEffectReader(buildSyntheticContainer());
    const stageRecord = reader.readDescription(0).techniques[0].passes[0].stages[0];

    const float = stageRecord.annotations.find((entry) => entry.name.value === "Scale");
    assert.deepEqual(Array.from(float.rawValue), [ 0, 0, 0, 64 ]);

    const text = stageRecord.annotations.find((entry) => entry.name.value === "Usage");
    assert.equal(text.stringValue.value, "diffuse");
    assert.equal(text.rawValue, null);
});

test("compareAnnotationNames orders by unsigned byte, matching Carbon's strcmp", () =>
{
    assert.ok(compareAnnotationNames("IsHeapView", "Order") < 0);
    assert.ok(compareAnnotationNames("Order", "Scale") < 0);
    assert.ok(compareAnnotationNames("a", "ab") < 0);
    assert.equal(compareAnnotationNames("same", "same"), 0);
    // "Z" (0x5a) before "a" (0x61) — the opposite of a locale-aware comparison.
    assert.ok(compareAnnotationNames("Z", "a") < 0);
});

test("the writer rejects counts Carbon's reader would reject", () =>
{
    const description = buildSyntheticDescription();
    const target = description.techniques[0].passes[0].stages[0];
    target.textures = Array.from({ length: CARBON_EFFECT_COUNT_CAPS.textures + 1 }, (_, index) => ({
        registerIndex: index & 0xff,
        name: str(`Texture${index}`),
        type: 1,
        count: 1,
        isSRGB: 0,
        isAutoregister: 0
    }));

    assert.throws(
        () => writeEffectDescription(new CjsByteWriter(), description, { arena: passthroughArena }),
        /textures count 65 exceeds Carbon's limit of 64/
    );
});

test("the writer rejects more stages per pass than Carbon's shader-type count", () =>
{
    const description = buildSyntheticDescription();
    description.techniques[0].passes[0].stages = Array.from(
        { length: CARBON_EFFECT_COUNT_CAPS.stages + 1 },
        (_, index) => stage(index)
    );

    assert.throws(
        () => writeEffectDescription(new CjsByteWriter(), description, { arena: passthroughArena }),
        /stages count 7 exceeds Carbon's limit of 6/
    );
});

test("the reader rejects a count above Carbon's cap", () =>
{
    // A hand-built stage claiming 65 pipeline inputs, which Carbon's SanityCheck
    // rejects at Tr2EffectDescription.cpp:236.
    const table = new CjsStringTable();
    const name = table.addString("Main");
    table.finish();

    const writer = new CjsByteWriter();
    writer.u8(1);
    writer.u32(table.offsetOf(name));
    writer.u8(1);
    writer.u8(1);
    writer.u8(0);
    writer.u32(0);
    writer.u32(0xffffffff);
    writer.u32(0);
    writer.u32(0);
    writer.u32(0);
    writer.u8(CARBON_EFFECT_COUNT_CAPS.pipelineInputs + 1);

    const reader = new CjsByteReader(writer.toBytes(), {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    assert.throws(() => readEffectDescription(reader), /pipelineInputs count 65/);
});

test("a sparse offset table is rejected by default and diagnosable when permitted", () =>
{
    const table = new CjsStringTable();
    const axisName = table.addString("SKINNED");
    const axisDescription = table.addString("");
    const optionA = table.addString("0");
    const optionB = table.addString("1");
    table.finish();

    const body = new CjsByteWriter();
    writeEffectDescription(body, { techniques: [], annotations: [] }, { arena: internArena(table) });

    // Two axis options declare two permutations, but only one body is present —
    // the shape a compiler run with --ignore-permutations produces.
    const bytes = writeCarbonEffectFile({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH,
        stringTableBytes: table.toBytes(),
        permutationRows: [ {
            name: "SKINNED",
            nameOffset: table.offsetOf(axisName),
            defaultOption: 0,
            descriptionOffset: table.offsetOf(axisDescription),
            type: 0,
            options: [ table.offsetOf(optionA), table.offsetOf(optionB) ]
        } ],
        bodies: [ { index: 0, bytes: body.toBytes() } ]
    });

    // Carbon does not reject a sparse file; it silently returns the wrong
    // permutation's shader, because it indexes the table positionally. So the
    // default is to fail closed.
    assert.throws(() => new CjsCarbonEffectReader(bytes), /offset table is sparse/);

    const permissive = new CjsCarbonEffectReader(bytes, { permissive: true });
    assert.equal(permissive.diagnostics.dense, false);
    assert.equal(permissive.diagnostics.recordCount, 1);
    assert.equal(permissive.diagnostics.permutationProduct, 2);
    assert.equal(permissive.diagnostics.indicesMatchPosition, true);
    assert.throws(() => permissive.requireDensePermutationTable(), /offset table is sparse/);
});

test("a misordered offset table is rejected by default", () =>
{
    const bytes = Uint8Array.from(buildSyntheticContainer());
    const reader = new CjsCarbonEffectReader(bytes, { permissive: true });
    const rowTableStart = reader.headerEnd - reader.records.length * 12;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Swap the stored index of row 0, which Carbon never reads.
    view.setUint32(rowTableStart, 3, true);

    assert.throws(() => new CjsCarbonEffectReader(bytes), /not positionally indexed/);
    const permissive = new CjsCarbonEffectReader(bytes, { permissive: true });
    assert.equal(permissive.diagnostics.indicesMatchPosition, false);
    assert.deepEqual(permissive.diagnostics.firstIndexMismatch, { position: 0, storedIndex: 3 });
});

test("the writer refuses to emit a table the reader would index wrongly", () =>
{
    const table = new CjsStringTable();
    table.finish();
    const body = new CjsByteWriter();
    writeEffectDescription(body, { techniques: [], annotations: [] }, { arena: internArena(table) });

    assert.throws(
        () => writeCarbonEffectFile({
            compilerVersion: COMPILER_VERSION,
            sourceHash: SOURCE_HASH,
            stringTableBytes: table.toBytes(),
            permutationRows: [],
            bodies: [ { index: 1, bytes: body.toBytes() } ]
        }),
        /must be dense and start at index 0/
    );
});

test("the reader rejects a body record pointing outside the file", () =>
{
    const bytes = Uint8Array.from(buildSyntheticContainer());
    const reader = new CjsCarbonEffectReader(bytes);

    // The first row's offset field sits 8 bytes into the row table.
    const rowTableStart = reader.headerEnd - reader.records.length * 12;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(rowTableStart + 4, bytes.length + 16, true);

    assert.throws(() => new CjsCarbonEffectReader(bytes), /body record 0 is out of range/);
});

test("the reader rejects a body record overlapping the header", () =>
{
    const bytes = Uint8Array.from(buildSyntheticContainer());
    const reader = new CjsCarbonEffectReader(bytes);
    const rowTableStart = reader.headerEnd - reader.records.length * 12;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(rowTableStart + 4, 0, true);

    assert.throws(() => new CjsCarbonEffectReader(bytes), /body record 0 is out of range/);
});

test("a description blob with a trailing tail is rejected, not silently truncated", () =>
{
    // The universal exhaustiveness rule: this is what carries the weight of the
    // cross-chunk agreement checks the container rewrite deletes. A writer bug
    // either fails to parse or lands the cursor short of the declared end.
    const table = new CjsStringTable();
    const description = buildSyntheticDescription();
    writeEffectDescription(new CjsByteWriter(), description, { arena: collectArena(table) });
    table.finish();

    const writer = new CjsByteWriter();
    writeEffectDescription(writer, description, { arena: internArena(table) });
    const body = writer.toBytes();

    const padded = new Uint8Array(body.length + 2);
    padded.set(body, 0);
    const reader = new CjsByteReader(padded, {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    assert.throws(
        () => readEffectDescription(reader),
        /description blob has 2 unparsed trailing byte\(s\)/
    );
});

test("a description blob one byte short is rejected too", () =>
{
    // The other direction of exhaustiveness. A long record is caught by the
    // trailing-byte assertion; a short one has to be caught by the cursor running
    // past its declared end, which is Carbon's own mechanism and the reason there
    // is no per-field check to write.
    const table = new CjsStringTable();
    const description = buildSyntheticDescription();
    writeEffectDescription(new CjsByteWriter(), description, { arena: collectArena(table) });
    table.finish();

    const writer = new CjsByteWriter();
    writeEffectDescription(writer, description, { arena: internArena(table) });
    const body = writer.toBytes();

    const truncated = body.subarray(0, body.length - 1);
    const reader = new CjsByteReader(truncated, {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    assert.throws(() => readEffectDescription(reader), /Unexpected end of/);
});

test("alias grouping distinguishes a wrong grouping from a right one", () =>
{
    // Negative control for the corpus oracle's grouping comparison. If two bodies
    // stop being byte-identical the grouping must change, or the comparison is
    // asserting nothing.
    const grouping = (records) =>
    {
        const byOffset = new Map();
        for (let index = 0; index < records.length; index += 1)
        {
            if (!byOffset.has(records[index].offset)) byOffset.set(records[index].offset, []);
            byOffset.get(records[index].offset).push(index);
        }
        return JSON.stringify(Array.from(byOffset.values()));
    };

    const shared = new CjsCarbonEffectReader(buildSyntheticContainer());
    // Bodies 2 and 3 are built from the same label, so they alias.
    assert.equal(shared.diagnostics.uniqueBodyCount, 3);
    assert.equal(grouping(shared.records), JSON.stringify([ [ 0 ], [ 1 ], [ 2, 3 ] ]));

    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    writer.addBody(0, buildSyntheticDescription({ label: "A" }));
    writer.addBody(1, buildSyntheticDescription({ label: "B" }));
    writer.addBody(2, buildSyntheticDescription({ label: "C" }));
    // One character different, so body 3 must no longer share with body 2.
    writer.addBody(3, buildSyntheticDescription({ label: "D" }));

    const distinct = new CjsCarbonEffectReader(writer.toBytes());
    assert.equal(distinct.diagnostics.uniqueBodyCount, 4);
    assert.notEqual(grouping(distinct.records), grouping(shared.records));
});

test("the reader rejects a body region that does not start where the header ends", () =>
{
    const original = buildSyntheticContainer();
    const probe = new CjsCarbonEffectReader(original);

    // Insert two bytes of slack between the header and the first body, and move
    // every row past it, so containment still holds but the base arithmetic does not.
    const shifted = new Uint8Array(original.length + 2);
    shifted.set(original.subarray(0, probe.headerEnd), 0);
    shifted.set(original.subarray(probe.headerEnd), probe.headerEnd + 2);
    const view = new DataView(shifted.buffer);
    const rowTableStart = probe.headerEnd - probe.records.length * 12;
    for (let index = 0; index < probe.records.length; index += 1)
    {
        view.setUint32(rowTableStart + index * 12 + 4, probe.records[index].offset + 2, true);
    }

    assert.throws(
        () => new CjsCarbonEffectReader(shifted),
        /body region does not start where the header ends/
    );
});

test("the reader rejects versions outside 8..15", () =>
{
    // Maintainer decision 2026-08-02: 8 is the lowest version worth reading.
    // Anything below the floor or above the current version fails at the gate.
    for (const version of [ 2, 7, 16 ])
    {
        const bytes = Uint8Array.from(buildSyntheticContainer());
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(0, version, true);
        assert.throws(
            () => new CjsCarbonEffectReader(bytes),
            new RegExp(`Unsupported Carbon effect version ${version}`)
        );
    }
});

/**
 * Builds a hand-written version-8 container: the legacy header (no compiler
 * version, no source hash) and one body in the v8 layout — pipeline inputs
 * without type/dimension, no register signature, two discarded dwords after
 * the program reference, old constant-type numbering, no texture/UAV array
 * counts, no sampler `isDynamic`, no static samplers, no libraries.
 *
 * @returns {Uint8Array} Container bytes.
 */
function buildLegacyV8Container()
{
    // Arena: strings then blobs, offsets fixed by construction.
    const arena = new CjsByteWriter();
    const encoder = new TextEncoder();
    const strings = { Main: 0, Const: 5, Tex: 11, Samp: 15, Uav: 20 };
    for (const value of Object.keys(strings))
    {
        arena.bytes(encoder.encode(value));
        arena.u8(0);
    }
    const SHADER_OFFSET = 24;
    arena.bytes(Uint8Array.of(0xde, 0xad, 0xbe, 0xef));
    const DEFAULTS_OFFSET = 28;
    arena.bytes(Uint8Array.of(1, 2, 3, 4));
    const arenaBytes = arena.toBytes();

    const body = new CjsByteWriter();
    const emit = (writer, values) => { for (const [ kind, value ] of values) writer[kind](value); };
    emit(body, [
        [ "u8", 1 ],                       // technique count
        [ "u32", strings.Main ],           // technique name
        [ "u8", 1 ],                       // pass count
        [ "u8", 1 ],                       // stage count
        [ "u8", 0 ],                       // stage type: vertex
        [ "u8", 1 ],                       // pipeline input count
        // usage/register/usageIndex/mask, no type/dimension bytes at v8
        [ "u8", 6 ], [ "u8", 1 ], [ "u8", 2 ], [ "u8", 0x0f ],
        [ "u32", 4 ], [ "u32", SHADER_OFFSET ],  // program blob reference
        [ "u32", 7 ], [ "u32", 9 ],              // pre-v12 discarded dwords
        [ "u32", 1 ], [ "u32", 2 ], [ "u32", 3 ], // thread group size
        [ "u32", 1 ],                      // constant count
        [ "u32", strings.Const ], [ "u32", 0 ], [ "u32", 4 ], // name/offset/size
        [ "u8", 2 ],                       // old type byte: BOOL
        [ "u8", 1 ], [ "u32", 1 ], [ "u8", 0 ], [ "u8", 1 ], // dim/elements/isSRGB/isAutoregister
        [ "u32", 4 ], [ "u32", DEFAULTS_OFFSET ], // default-value blob reference
        [ "u8", 1 ],                       // texture count
        // register/name/type/isSRGB/isAutoregister, no array count at v8
        [ "u8", 0 ], [ "u32", strings.Tex ], [ "u8", 2 ], [ "u8", 1 ], [ "u8", 0 ],
        [ "u8", 1 ],                       // sampler count
        [ "u8", 0 ], [ "u32", strings.Samp ], // register/name
        // comparison/filters/addresses
        [ "u8", 0 ], [ "u8", 1 ], [ "u8", 1 ], [ "u8", 1 ], [ "u8", 1 ], [ "u8", 1 ], [ "u8", 1 ],
        [ "f32", 0.5 ], [ "u8", 4 ], [ "u8", 2 ], // mipLODBias/maxAnisotropy/comparisonFunc
        [ "f32", 0 ], [ "f32", 0 ], [ "f32", 0 ], [ "f32", 1 ], // border colour
        [ "f32", 0 ], [ "f32", 8 ],        // minLOD/maxLOD, no isDynamic byte at v8
        [ "u8", 1 ],                       // uav count
        // register/name/type/isAutoregister, no array count at v8
        [ "u8", 1 ], [ "u32", strings.Uav ], [ "u8", 5 ], [ "u8", 1 ],
        [ "u8", 0 ],                       // stage annotations
        [ "u8", 1 ], [ "u32", 22 ], [ "u32", 3 ], // render states
        [ "u16", 0 ]                       // effect annotations
    ]);
    const bodyBytes = body.toBytes();

    const writer = new CjsByteWriter();
    writer.u32(8);                         // version — and no compiler version or hash
    writer.u32(arenaBytes.length);
    writer.bytes(arenaBytes);
    writer.u8(1);                          // one permutation axis, one option
    emit(writer, [
        [ "u32", strings.Main ], [ "u8", 0 ], [ "u32", strings.Main ],
        [ "u8", 1 ], [ "u8", 1 ], [ "u32", strings.Main ]
    ]);
    const HEADER_END = 4 + 4 + arenaBytes.length + 16 + 4 + 12;
    writer.u32(1);                         // one offset-table row
    writer.u32(0);
    writer.u32(HEADER_END);
    writer.u32(bodyBytes.length);
    writer.bytes(bodyBytes);
    return writer.toBytes();
}

test("a version-8 container reads through the restored version parameter", () =>
{
    const reader = new CjsCarbonEffectReader(buildLegacyV8Container(), { source: "legacy-v8" });

    assert.equal(reader.version, 8);
    assert.equal(reader.compilerVersion, null);
    assert.equal(reader.sourceHash, null);
    assert.equal(reader.permutations.length, 1);
    assert.equal(reader.records.length, 1);

    const description = reader.readDescription(0);
    assert.equal(description.techniques[0].name.value, "Main");
    assert.deepEqual(description.techniques[0].libraries, []);

    const stage = description.techniques[0].passes[0].stages[0];
    // Normalized to the v15 record shape: derived pipeline-input type (UINT for
    // usage 6) and dimension, empty signature (no registers before v9), array
    // counts defaulted to one, old constant-type byte remapped (BOOL 2 -> 3).
    assert.deepEqual(stage.pipelineInputs, [
        { usage: 6, registerIndex: 1, usageIndex: 2, usedMask: 0x0f, type: 2, dimension: 4 }
    ]);
    assert.deepEqual(stage.registers, []);
    assert.deepEqual(stage.staticSamplers, []);
    assert.deepEqual(stage.threadGroupSize, [ 1, 2, 3 ]);
    assert.deepEqual(Array.from(stage.shaderData.bytes), [ 0xde, 0xad, 0xbe, 0xef ]);
    assert.deepEqual(Array.from(stage.defaultValues.bytes), [ 1, 2, 3, 4 ]);
    assert.equal(stage.constants[0].name.value, "Const");
    assert.equal(stage.constants[0].type, 3);
    assert.equal(stage.textures[0].count, 1);
    assert.equal(stage.uavs[0].count, 1);
    assert.equal(stage.samplers[0].name.value, "Samp");
    // The concept did not exist at v8, so the record must not claim a value.
    assert.equal("isDynamic" in stage.samplers[0], false);
    assert.deepEqual(
        description.techniques[0].passes[0].renderStates,
        [ { state: 22, value: 3 } ]
    );
});

test("the reader rejects a truncated arena and an empty offset table", () =>
{
    const bytes = Uint8Array.from(buildSyntheticContainer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(40, bytes.length, true);
    assert.throws(() => new CjsCarbonEffectReader(bytes), /Invalid Carbon effect string-table size/);

    const empty = Uint8Array.from(buildSyntheticContainer());
    const emptyReader = new CjsCarbonEffectReader(empty);
    const countOffset = emptyReader.headerEnd - emptyReader.records.length * 12 - 4;
    new DataView(empty.buffer, empty.byteOffset, empty.byteLength).setUint32(countOffset, 0, true);
    assert.throws(() => new CjsCarbonEffectReader(empty), /contains no compiled bodies/);
});

test("the writer needs at least one body", () =>
{
    assert.throws(
        () => writeCarbonEffectFile({
            compilerVersion: COMPILER_VERSION,
            sourceHash: SOURCE_HASH,
            stringTableBytes: new Uint8Array(0),
            permutationRows: [],
            bodies: []
        }),
        /needs at least one body/
    );
});

test("the writer rejects a source hash that is not 32 bytes", () =>
{
    const table = new CjsStringTable();
    table.finish();
    const body = new CjsByteWriter();
    writeEffectDescription(body, { techniques: [], annotations: [] }, { arena: internArena(table) });

    assert.throws(
        () => writeCarbonEffectFile({
            compilerVersion: COMPILER_VERSION,
            sourceHash: "tooshort",
            stringTableBytes: table.toBytes(),
            permutationRows: [],
            bodies: [ { index: 0, bytes: body.toBytes() } ]
        }),
        /Source hash must be exactly 32 bytes/
    );
});

test("our containers are bare Carbon files, with nothing prepended", () =>
{
    // A twelve-byte envelope (magic | containerVersion | payloadKind) used to sit
    // in front of these bytes, and a "v16" was proposed to mark the variant. Both
    // are gone. Neither answered the only question that matters for an addition:
    // what breaks without it?
    //
    // Backend selection is by resource path -- effect.webgpu/, effect.webgl2/ --
    // exactly as Carbon selects effect.dx11/dx12/metal, and Carbon carries no
    // payload tag anywhere. A version of our own would have claimed a number CCP
    // owns, in the field whose job is telling a reader how to parse.
    //
    // So the file opens on Carbon's version dword, and Tr2EffectRes/Tr2Shader
    // read it through the Carbon path rather than a bespoke branch.
    const bare = buildSyntheticContainer();
    const view = new DataView(bare.buffer, bare.byteOffset);
    assert.equal(view.getUint32(0, true), CARBON_EFFECT_DATA_VERSION);

    // Every Carbon version dword has byte 0 <= 0x0f and bytes 1..3 zero. Recorded
    // because it is what made a printable-ASCII magic safe, and it is the reason
    // the magic was defensible even though it was never necessary.
    for (let version = 2; version <= CARBON_EFFECT_DATA_VERSION; version += 1)
    {
        const probe = new CjsByteWriter();
        probe.u32(version);
        const bytes = probe.toBytes();
        assert.ok(bytes[0] <= 0x0f);
        assert.deepEqual(Array.from(bytes.subarray(1)), [ 0, 0, 0 ]);
    }
});

test("the per-pass block is found by Rule 1, not by anything announcing it", () =>
{
    // Rule 1 -- every sized record parses to exactly its declared end -- is what
    // replaces the envelope. A body's declared size is in the offset table, so
    // the wrong reading either throws or lands short, and one retry settles it.
    const table = new CjsStringTable();
    const description = buildSyntheticDescription();
    for (const technique of description.techniques)
    {
        technique.libraries = [];
        for (const pass of technique.passes) pass.backendBlock = blob([ 1, 0, 0 ]);
    }

    const writer = new CjsCarbonEffectWriter({
        backend: true,
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    // Four bodies: the axes declare 2 x 2, and a sparse table fails closed.
    for (let index = 0; index < 4; index += 1) writer.addBody(index, description);
    const bytes = writer.toBytes();
    assert.ok(table);

    const reader = new CjsCarbonEffectReader(bytes);
    const told = reader.readDescription(0, { backend: true });
    const detected = reader.readDescription(0);

    assert.deepEqual(
        detected.techniques[0].passes.map((pass) => pass.backendBlock?.size ?? null),
        told.techniques[0].passes.map((pass) => pass.backendBlock?.size ?? null)
    );

    // Negative control: the reading that ignores blocks must FAIL on this body.
    // If both readings parsed clean, detection would be choosing arbitrarily and
    // the property would be a coincidence rather than a rule.
    assert.throws(() => reader.readDescription(0, { backend: false }));

    // And the converse: a body with no blocks must not gain one.
    const plainWriter = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) plainWriter.addPermutation(axis);
    for (let index = 0; index < 4; index += 1)
    {
        plainWriter.addBody(index, buildSyntheticDescription());
    }
    const plain = new CjsCarbonEffectReader(plainWriter.toBytes());
    for (const pass of plain.readDescription(0).techniques[0].passes)
    {
        assert.equal(pass.backendBlock, undefined);
    }
});

test("a blob reference with bytes but zero declared size is not dereferenced", () =>
{
    // Guards the one wire position where Carbon's 0xffffffff is legal.
    const table = new CjsStringTable();
    const name = table.addString("Main");
    table.finish();

    const description = {
        techniques: [ {
            name: str("Main"),
            passes: [ {
                stages: [ {
                    type: 0,
                    shaderData: blob([]),
                    threadGroupSize: [ 0, 0, 0 ],
                    pipelineInputs: [],
                    registers: [],
                    staticSamplers: [],
                    constants: [],
                    defaultValues: blob([]),
                    textures: [],
                    samplers: [],
                    uavs: [],
                    annotations: []
                } ],
                renderStates: []
            } ],
            libraries: []
        } ],
        annotations: []
    };

    const writer = new CjsByteWriter();
    writeEffectDescription(writer, description, { arena: internArena(table) });

    const reader = new CjsByteReader(writer.toBytes(), {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    const parsed = readEffectDescription(reader);
    assert.equal(parsed.techniques[0].passes[0].stages[0].shaderData.offset, 0xffffffff);
    assert.equal(parsed.techniques[0].name.value, "Main");
    assert.ok(table.offsetOf(name) >= 0);
});
