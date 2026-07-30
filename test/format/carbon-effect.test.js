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
    CARBON_EFFECT_ENVELOPE_BYTES,
    CARBON_EFFECT_PAYLOAD_KIND,
    looksLikeBareCarbonEffect,
    readCarbonEffectEnvelope,
    writeCarbonEffectEnvelope
} from "../../src/format/carbonEffect/carbonEffectEnvelope.js";
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

test("the reader rejects a version it has no authoritative writer for", () =>
{
    for (const version of [ 8, 13, 14, 16 ])
    {
        const bytes = Uint8Array.from(buildSyntheticContainer());
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(0, version, true);
        assert.throws(
            () => new CjsCarbonEffectReader(bytes),
            new RegExp(`Unsupported Carbon effect version ${version}`)
        );
    }
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

test("the envelope is provably disjoint from a bare Carbon container", () =>
{
    const bare = buildSyntheticContainer();
    assert.equal(looksLikeBareCarbonEffect(bare), true);

    const writer = new CjsByteWriter();
    writeCarbonEffectEnvelope(writer, {
        magic: "CWGP",
        containerVersion: 2,
        payloadKind: CARBON_EFFECT_PAYLOAD_KIND.WGSL
    });
    writer.bytes(bare);
    const enveloped = writer.toBytes();

    assert.equal(looksLikeBareCarbonEffect(enveloped), false);
    assert.equal(enveloped.length, bare.length + CARBON_EFFECT_ENVELOPE_BYTES);

    const reader = new CjsByteReader(enveloped);
    const envelope = readCarbonEffectEnvelope(reader, { magic: "CWGP", containerVersion: 2 });
    assert.equal(envelope.payloadKind, CARBON_EFFECT_PAYLOAD_KIND.WGSL);
    assert.equal(reader.offset, CARBON_EFFECT_ENVELOPE_BYTES);

    // Every Carbon version dword has byte 0 <= 0x0f and bytes 1..3 zero; every
    // printable-ASCII magic byte is >= 0x20. The two ranges cannot overlap.
    for (let version = 2; version <= CARBON_EFFECT_DATA_VERSION; version += 1)
    {
        const probe = new CjsByteWriter();
        probe.u32(version);
        const bytes = probe.toBytes();
        assert.ok(bytes[0] <= 0x0f);
        assert.deepEqual(Array.from(bytes.subarray(1)), [ 0, 0, 0 ]);
    }
});

test("the envelope rejects a non-printable magic and a foreign container", () =>
{
    assert.throws(
        () => writeCarbonEffectEnvelope(new CjsByteWriter(), {
            magic: "BCD",
            containerVersion: 2,
            payloadKind: 0
        }),
        /must be printable ASCII/
    );
    assert.throws(
        () => writeCarbonEffectEnvelope(new CjsByteWriter(), {
            magic: "TOOLONG",
            containerVersion: 2,
            payloadKind: 0
        }),
        /must be exactly 4 bytes/
    );

    const writer = new CjsByteWriter();
    writeCarbonEffectEnvelope(writer, { magic: "CEWG", containerVersion: 2, payloadKind: 2 });
    assert.throws(
        () => readCarbonEffectEnvelope(new CjsByteReader(writer.toBytes()), {
            magic: "CWGP",
            containerVersion: 2
        }),
        /Unexpected container magic "CEWG"/
    );
    assert.throws(
        () => readCarbonEffectEnvelope(new CjsByteReader(writer.toBytes()), {
            magic: "CEWG",
            containerVersion: 3
        }),
        /Unsupported container version 2; expected 3/
    );
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
