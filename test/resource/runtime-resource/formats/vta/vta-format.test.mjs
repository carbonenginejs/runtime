import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

import { CjsVtaFormat } from "../../../../../src/resource/formats/vta/index.js";
import { decodeRle7 } from "../../../../../src/resource/formats/vta/core/rle7.js";

/**
 * Synthetic VTA builder mirroring Carbon's writer (VtaHandler.cpp:280-415):
 * 32-byte header, 52-byte GridInfos, u64 frame-major offset table,
 * length-prefixed metadata pairs, zlib-compressed blobs to dataEnd.
 */
function buildVta({ grids, frames, metadata = {} })
{
    const
        gridCount = grids.length,
        frameCount = frames.length,
        metadataEntries = Object.entries(metadata),
        blobs = [];

    for (const frame of frames)
    {
        for (const payload of frame) blobs.push(deflateSync(Buffer.from(payload)));
    }

    let metadataSize = 0;
    for (const [ key, value ] of metadataEntries) metadataSize += 8 + key.length + value.length;

    const
        headerSize = 32,
        gridsSize = gridCount * 52,
        offsetsSize = frameCount * gridCount * 8,
        payloadStart = headerSize + gridsSize + offsetsSize + metadataSize,
        dataEnd = payloadStart + blobs.reduce((sum, blob) => sum + blob.length, 0),
        bytes = new Uint8Array(dataEnd),
        view = new DataView(bytes.buffer);

    bytes.set([ 0x56, 0x54, 0x41, 0 ], 0);
    view.setUint32(4, 1, true);
    view.setUint32(8, gridCount, true);
    view.setUint32(12, frameCount, true);
    view.setUint32(16, metadataEntries.length, true);
    view.setBigUint64(24, BigInt(dataEnd), true);

    let offset = headerSize;
    for (const grid of grids)
    {
        view.setUint32(offset, grid.format ?? 61, true);
        view.setUint32(offset + 4, grid.encoding, true);
        view.setUint32(offset + 8, grid.width, true);
        view.setUint32(offset + 12, grid.height, true);
        view.setUint32(offset + 16, grid.depth, true);
        for (let i = 0; i < grid.name.length; i++) bytes[offset + 20 + i] = grid.name.charCodeAt(i);
        offset += 52;
    }

    let blobOffset = payloadStart;
    for (const blob of blobs)
    {
        view.setBigUint64(offset, BigInt(blobOffset), true);
        offset += 8;
        blobOffset += blob.length;
    }

    for (const [ key, value ] of metadataEntries)
    {
        view.setUint32(offset, key.length, true);
        offset += 4;
        for (let i = 0; i < key.length; i++) bytes[offset + i] = key.charCodeAt(i);
        offset += key.length;
        view.setUint32(offset, value.length, true);
        offset += 4;
        for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
        offset += value.length;
    }

    blobOffset = payloadStart;
    for (const blob of blobs)
    {
        bytes.set(blob, blobOffset);
        blobOffset += blob.length;
    }
    return bytes;
}

/** RLE7 encoder matching Carbon's stream shape: even values, runs of 1-256. */
function encodeRle7(voxels)
{
    const out = [];
    let i = 0;
    while (i < voxels.length)
    {
        const value = voxels[i] & 0xfe;
        let run = 1;
        while (run < 256 && i + run < voxels.length && (voxels[i + run] & 0xfe) === value) run++;
        if (run > 1)
        {
            out.push(value | 1, run - 1);
        }
        else
        {
            out.push(value);
        }
        i += run;
    }
    return Uint8Array.from(out);
}

test("isVTA accepts the signature and rejects near misses", () =>
{
    const vta = buildVta({ grids: [ { encoding: 0, width: 1, height: 1, depth: 1, name: "density" } ], frames: [ [ new Uint8Array(1) ] ] });
    assert.equal(CjsVtaFormat.isVTA(vta), true);
    const wrongVersion = Uint8Array.from(vta);
    wrongVersion[4] = 2;
    assert.equal(CjsVtaFormat.isVTA(wrongVersion), false);
    assert.equal(CjsVtaFormat.isVTA(Uint8Array.from([ 0x56, 0x54, 0x41, 0x21 ])), false);
});

test("inspect reads header, grid table and metadata without decoding", () =>
{
    const vta = buildVta({
        grids: [ { encoding: 1, width: 4, height: 2, depth: 3, name: "density" } ],
        frames: [ [ encodeRle7(new Uint8Array(24)) ] ],
        metadata: { source: "vortex.vdb" }
    });
    const info = CjsVtaFormat.inspect(vta);
    assert.equal(info.version, 1);
    assert.equal(info.gridCount, 1);
    assert.equal(info.frameCount, 1);
    assert.deepEqual(info.grids[0], { format: 61, encoding: 1, width: 4, height: 2, depth: 3, name: "density" });
    assert.deepEqual(info.metadata, { source: "vortex.vdb" });
});

test("encoding NONE frames decode as the inflated bytes", async () =>
{
    const voxels = Uint8Array.from({ length: 8 }, (_, i) => i * 7 & 0xff);
    const vta = buildVta({
        grids: [ { encoding: 0, width: 2, height: 2, depth: 2, name: "density" } ],
        frames: [ [ voxels ] ]
    });
    const result = await CjsVtaFormat.readAsync(vta, { emit: "volume" });
    assert.equal(result.grids.length, 1);
    assert.deepEqual([ ...result.grids[0].frames[0] ], [ ...voxels ]);
    assert.equal(result.grids[0].format, "r8unorm");
    assert.equal(result.grids[0].depth, 2);
});

test("RLE7 frames form a delta chain with uint8 wraparound", async () =>
{
    const
        frame0 = Uint8Array.from([ 10, 10, 10, 10, 200, 200, 0, 0 ]),
        delta1 = Uint8Array.from([ 2, 2, 2, 2, 100, 100, 0, 0 ]),
        frame1 = frame0.map((v, i) => (v + delta1[i]) & 0xff);

    const vta = buildVta({
        grids: [ { encoding: 1, width: 2, height: 2, depth: 2, name: "density" } ],
        frames: [ [ encodeRle7(frame0) ], [ encodeRle7(delta1) ] ]
    });

    const all = await CjsVtaFormat.readAsync(vta, { emit: "volume", allFrames: true });
    assert.deepEqual([ ...all.grids[0].frames[0] ], [ ...frame0 ]);
    assert.deepEqual([ ...all.grids[0].frames[1] ], [ ...frame1 ]);

    // Reaching frame 1 directly still decodes the chain from frame 0.
    const one = await CjsVtaFormat.readAsync(vta, { emit: "volume", frame: 1 });
    assert.equal(one.grids[0].firstFrame, 1);
    assert.deepEqual([ ...one.grids[0].frames[0] ], [ ...frame1 ]);
});

test("multi-grid offsets are frame-major and grids select by name", async () =>
{
    const
        densityF0 = Uint8Array.from([ 2, 4 ]),
        heatF0 = Uint8Array.from([ 6, 8 ]),
        densityDelta = Uint8Array.from([ 10, 10 ]),
        heatDelta = Uint8Array.from([ 20, 20 ]);

    const vta = buildVta({
        grids: [
            { encoding: 1, width: 2, height: 1, depth: 1, name: "density" },
            { encoding: 1, width: 2, height: 1, depth: 1, name: "temperature" }
        ],
        // Blob order per frame: [frame0 grid0, frame0 grid1, frame1 grid0, ...]
        frames: [
            [ encodeRle7(densityF0), encodeRle7(heatF0) ],
            [ encodeRle7(densityDelta), encodeRle7(heatDelta) ]
        ]
    });

    const temperature = await CjsVtaFormat.readAsync(vta, { emit: "volume", grid: "temperature", frame: 1 });
    assert.equal(temperature.grids.length, 1);
    assert.deepEqual([ ...temperature.grids[0].frames[0] ], [ 26, 28 ]);

    const density = await CjsVtaFormat.readAsync(vta, { emit: "volume", grid: 0 });
    assert.deepEqual([ ...density.grids[0].frames[0] ], [ 2, 4 ]);

    await assert.rejects(
        CjsVtaFormat.readAsync(vta, { emit: "volume", grid: "smoke" }),
        /no grid named "smoke"/u
    );
});

test("sync Read serves raw and debug targets and refuses volumes", () =>
{
    const vta = buildVta({
        grids: [ { encoding: 0, width: 1, height: 1, depth: 1, name: "density" } ],
        frames: [ [ new Uint8Array(1) ] ]
    });
    assert.equal(CjsVtaFormat.read(vta).emit, "raw");
    assert.equal(CjsVtaFormat.read(vta, { emit: "json" }).gridCount, 1);
    assert.throws(() => CjsVtaFormat.read(vta, { emit: "volume" }), { code: "CJS_FORMAT_OUTPUT_ASYNC_ONLY" });
    assert.equal(CjsVtaFormat.probeSupport(vta).supported, true);
});

test("the RLE7 decoder enforces exact stream consumption", () =>
{
    const out = new Uint8Array(4);
    decodeRle7(Uint8Array.from([ 8 | 1, 3 ]), out);
    assert.deepEqual([ ...out ], [ 8, 8, 8, 8 ]);
    assert.throws(() => decodeRle7(Uint8Array.from([ 8 | 1, 3, 99 ]), new Uint8Array(4)), /trailing/u);
    assert.throws(() => decodeRle7(Uint8Array.from([ 8 ]), new Uint8Array(4)), /ended after/u);
});
