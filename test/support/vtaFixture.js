import { deflateSync } from "node:zlib";

/** Builds synthetic frame-major VTA bytes for decoder and playback regressions. */
export function buildVta({ grids, frames, metadata = {} })
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
