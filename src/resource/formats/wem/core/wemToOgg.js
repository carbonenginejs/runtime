import { BitReader, OggPageWriter, ilog } from "./bitStream.js";
import { parseCodebookLibrary, rebuildCodebookById } from "./codebookLibrary.js";
import { getPackedCodebooksAotuv603 } from "./packedCodebooksAotuv603.js";

/**
 * Wwise Vorbis (.wem) to standard Ogg Vorbis repacker.
 *
 * This is a lossless container transform: the identification/comment/setup
 * headers are regenerated (setup codebooks expanded from the packed aoTuV
 * 6.03 library), modified audio packets get their type/window bits restored,
 * and packets are paginated with correct granule positions computed from the
 * mode block flags — so no separate revorb pass is needed. No audio is
 * decoded or re-encoded. Algorithm behavior follows the ww2ogg reference
 * (BSD-licensed) as an original reimplementation.
 */

const VENDOR = "converted from Audiokinetic Wwise by @carbonenginejs/runtime/resource";

function parseError(message)
{
    const error = new Error(`wem: ${message}`);
    error.code = "CJS_FORMAT_PARSE_ERROR";
    return error;
}

function notSupported(message)
{
    const error = new Error(`wem: ${message}`);
    error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
    return error;
}

/**
 * Parse the Wwise Vorbis stream layout needed for repacking.
 *
 * @param {Uint8Array} bytes Wem bytes.
 * @returns {object} Stream layout, vorb fields, and loop info.
 */
export function parseWemVorbisLayout(bytes)
{
    if (bytes.length < 12) throw parseError("missing RIFF");
    const container = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (container !== "RIFF" && container !== "RIFX") throw parseError("missing RIFF");
    const littleEndian = container !== "RIFX";
    const readU16 = littleEndian ? readU16LE : readU16BE;
    const readU32 = littleEndian ? readU32LE : readU32BE;

    if (String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== "WAVE") throw parseError("missing WAVE");
    const riffSize = readU32(bytes, 4) + 8;
    if (riffSize > bytes.length) throw parseError("RIFF truncated");

    let fmtOffset = -1, fmtSize = -1;
    let vorbOffset = -1, vorbSize = -1;
    let dataOffset = -1, dataSize = -1;
    let smplOffset = -1;

    let chunkOffset = 12;
    while (chunkOffset < riffSize)
    {
        if (chunkOffset + 8 > riffSize) throw parseError("chunk header truncated");
        const id = String.fromCharCode(bytes[chunkOffset], bytes[chunkOffset + 1], bytes[chunkOffset + 2], bytes[chunkOffset + 3]);
        const size = readU32(bytes, chunkOffset + 4);
        const contentOffset = chunkOffset + 8;

        if (id === "fmt ") { fmtOffset = contentOffset; fmtSize = size; }
        else if (id === "vorb") { vorbOffset = contentOffset; vorbSize = size; }
        else if (id === "data") { dataOffset = contentOffset; dataSize = size; }
        else if (id === "smpl") { smplOffset = contentOffset; }

        chunkOffset = contentOffset + size;
    }
    if (chunkOffset > riffSize) throw parseError("chunk truncated");
    if (fmtOffset === -1 || dataOffset === -1) throw parseError("expected fmt, data chunks");
    if (vorbOffset === -1 && fmtSize !== 0x42) throw parseError("expected 0x42 fmt if vorb missing (not Wwise Vorbis?)");
    if (vorbOffset !== -1 && fmtSize !== 0x28 && fmtSize !== 0x18 && fmtSize !== 0x12) throw parseError("bad fmt size");
    if (vorbOffset === -1 && fmtSize === 0x42)
    {
        vorbOffset = fmtOffset + 0x18;
        vorbSize = -1;
    }

    if (readU16(bytes, fmtOffset) !== 0xffff) throw parseError("bad codec id (not Wwise Vorbis)");
    const channels = readU16(bytes, fmtOffset + 2);
    const sampleRate = readU32(bytes, fmtOffset + 4);
    const avgBytesPerSecond = readU32(bytes, fmtOffset + 8);
    if (readU16(bytes, fmtOffset + 12) !== 0) throw parseError("bad block align");
    if (readU16(bytes, fmtOffset + 14) !== 0) throw parseError("expected 0 bps");
    if (readU16(bytes, fmtOffset + 16) !== fmtSize - 0x12) throw parseError("bad extra fmt length");

    if (vorbSize !== -1 && vorbSize !== 0x28 && vorbSize !== 0x2a && vorbSize !== 0x2c && vorbSize !== 0x32 && vorbSize !== 0x34)
    {
        throw parseError("bad vorb size");
    }
    if (vorbSize === 0x28 || vorbSize === 0x2c)
    {
        throw notSupported("old header-triad Wwise Vorbis is not supported by this repacker");
    }

    const sampleCount = readU32(bytes, vorbOffset);
    let noGranule = false;
    let modPackets = false;

    if (vorbSize === -1 || vorbSize === 0x2a)
    {
        noGranule = true;
        const modSignal = readU32(bytes, vorbOffset + 0x4);
        if (modSignal !== 0x4a && modSignal !== 0x4b && modSignal !== 0x69 && modSignal !== 0x70)
        {
            modPackets = true;
        }
    }

    const offsetInfoBase = (vorbSize === -1 || vorbSize === 0x2a) ? vorbOffset + 0x10 : vorbOffset + 0x18;
    const setupPacketOffset = readU32(bytes, offsetInfoBase);
    const firstAudioPacketOffset = readU32(bytes, offsetInfoBase + 4);

    const blocksizeBase = (vorbSize === -1 || vorbSize === 0x2a) ? vorbOffset + 0x24 : vorbOffset + 0x2c;
    const uid = readU32(bytes, blocksizeBase);
    const blocksize0Pow = bytes[blocksizeBase + 4];
    const blocksize1Pow = bytes[blocksizeBase + 5];

    let loop = null;
    if (smplOffset !== -1)
    {
        const loopCount = readU32(bytes, smplOffset + 0x1c);
        if (loopCount === 1)
        {
            const loopStart = readU32(bytes, smplOffset + 0x2c);
            let loopEnd = readU32(bytes, smplOffset + 0x30);
            loopEnd = loopEnd === 0 ? sampleCount : loopEnd + 1;
            if (loopStart < sampleCount && loopEnd <= sampleCount && loopStart <= loopEnd)
            {
                loop = { start: loopStart, end: loopEnd };
            }
        }
    }

    return {
        littleEndian,
        channels,
        sampleRate,
        avgBytesPerSecond,
        sampleCount,
        noGranule,
        modPackets,
        setupPacketOffset,
        firstAudioPacketOffset,
        uid,
        blocksize0Pow,
        blocksize1Pow,
        dataOffset,
        dataSize,
        loop
    };
}

function readPacketHeader(bytes, offset, layout)
{
    const readU16 = layout.littleEndian ? readU16LE : readU16BE;
    const readU32 = layout.littleEndian ? readU32LE : readU32BE;
    const headerSize = layout.noGranule ? 2 : 6;
    const end = layout.dataOffset + layout.dataSize;
    if (offset + headerSize > end) throw parseError("packet header truncated");
    const size = readU16(bytes, offset);
    const granule = layout.noGranule ? 0 : readU32(bytes, offset + 2);
    return {
        size,
        granule,
        payloadOffset: offset + headerSize,
        nextOffset: offset + headerSize + size
    };
}

function writeVorbisHeaderType(writer, type)
{
    writer.writeBits(type, 8);
    const word = "vorbis";
    for (let i = 0; i < 6; i++) writer.writeBits(word.charCodeAt(i), 8);
}

function generateHeaders(bytes, layout, library, writer)
{
    // identification packet
    writeVorbisHeaderType(writer, 1);
    writer.writeBits(0, 32);
    writer.writeBits(layout.channels, 8);
    writer.writeBits(layout.sampleRate, 32);
    writer.writeBits(0, 32);
    writer.writeBits((layout.avgBytesPerSecond * 8) >>> 0, 32);
    writer.writeBits(0, 32);
    writer.writeBits(layout.blocksize0Pow, 4);
    writer.writeBits(layout.blocksize1Pow, 4);
    writer.writeBits(1, 1);
    writer.flushPage();

    // comment packet
    writeVorbisHeaderType(writer, 3);
    writer.writeBits(VENDOR.length, 32);
    for (let i = 0; i < VENDOR.length; i++) writer.writeBits(VENDOR.charCodeAt(i), 8);
    if (!layout.loop)
    {
        writer.writeBits(0, 32);
    }
    else
    {
        const comments = [ `LoopStart=${layout.loop.start}`, `LoopEnd=${layout.loop.end}` ];
        writer.writeBits(comments.length, 32);
        for (const comment of comments)
        {
            writer.writeBits(comment.length, 32);
            for (let i = 0; i < comment.length; i++) writer.writeBits(comment.charCodeAt(i), 8);
        }
    }
    writer.writeBits(1, 1);
    writer.flushPage();

    // setup packet: expand codebooks, copy floors/residues/mappings/modes
    writeVorbisHeaderType(writer, 5);

    const setupHeader = readPacketHeader(bytes, layout.dataOffset + layout.setupPacketOffset, layout);
    if (setupHeader.granule !== 0) throw parseError("setup packet granule != 0");
    const reader = new BitReader(bytes, setupHeader.payloadOffset);

    const codebookCountLess1 = reader.readBits(8);
    const codebookCount = codebookCountLess1 + 1;
    writer.writeBits(codebookCountLess1, 8);

    for (let i = 0; i < codebookCount; i++)
    {
        const codebookId = reader.readBits(10);
        rebuildCodebookById(library, codebookId, writer);
    }

    // time-domain transform placeholder
    writer.writeBits(0, 6);
    writer.writeBits(0, 16);

    // floors
    const floorCountLess1 = reader.readBits(6);
    const floorCount = floorCountLess1 + 1;
    writer.writeBits(floorCountLess1, 6);
    for (let i = 0; i < floorCount; i++)
    {
        writer.writeBits(1, 16);

        const floor1Partitions = reader.readBits(5);
        writer.writeBits(floor1Partitions, 5);

        const partitionClassList = new Array(floor1Partitions);
        let maximumClass = 0;
        for (let j = 0; j < floor1Partitions; j++)
        {
            const partitionClass = reader.readBits(4);
            writer.writeBits(partitionClass, 4);
            partitionClassList[j] = partitionClass;
            if (partitionClass > maximumClass) maximumClass = partitionClass;
        }

        const classDimensionsList = new Array(maximumClass + 1);
        for (let j = 0; j <= maximumClass; j++)
        {
            const classDimensionsLess1 = reader.readBits(3);
            writer.writeBits(classDimensionsLess1, 3);
            classDimensionsList[j] = classDimensionsLess1 + 1;

            const classSubclasses = reader.readBits(2);
            writer.writeBits(classSubclasses, 2);

            if (classSubclasses !== 0)
            {
                const masterbook = reader.readBits(8);
                writer.writeBits(masterbook, 8);
                if (masterbook >= codebookCount) throw parseError("invalid floor1 masterbook");
            }

            for (let k = 0; k < (1 << classSubclasses); k++)
            {
                const subclassBookPlus1 = reader.readBits(8);
                writer.writeBits(subclassBookPlus1, 8);
                if (subclassBookPlus1 - 1 >= 0 && subclassBookPlus1 - 1 >= codebookCount)
                {
                    throw parseError("invalid floor1 subclass book");
                }
            }
        }

        writer.writeBits(reader.readBits(2), 2);
        const rangebits = reader.readBits(4);
        writer.writeBits(rangebits, 4);

        for (let j = 0; j < floor1Partitions; j++)
        {
            for (let k = 0; k < classDimensionsList[partitionClassList[j]]; k++)
            {
                writer.writeBits(reader.readBits(rangebits), rangebits);
            }
        }
    }

    // residues
    const residueCountLess1 = reader.readBits(6);
    const residueCount = residueCountLess1 + 1;
    writer.writeBits(residueCountLess1, 6);
    for (let i = 0; i < residueCount; i++)
    {
        const residueType = reader.readBits(2);
        writer.writeBits(residueType, 16);
        if (residueType > 2) throw parseError("invalid residue type");

        const residueBegin = reader.readBits(24);
        const residueEnd = reader.readBits(24);
        const residuePartitionSizeLess1 = reader.readBits(24);
        const residueClassificationsLess1 = reader.readBits(6);
        const residueClassbook = reader.readBits(8);
        const residueClassifications = residueClassificationsLess1 + 1;
        writer.writeBits(residueBegin, 24);
        writer.writeBits(residueEnd, 24);
        writer.writeBits(residuePartitionSizeLess1, 24);
        writer.writeBits(residueClassificationsLess1, 6);
        writer.writeBits(residueClassbook, 8);
        if (residueClassbook >= codebookCount) throw parseError("invalid residue classbook");

        const residueCascade = new Array(residueClassifications);
        for (let j = 0; j < residueClassifications; j++)
        {
            const lowBits = reader.readBits(3);
            writer.writeBits(lowBits, 3);
            const bitflag = reader.readBits(1);
            writer.writeBits(bitflag, 1);
            let highBits = 0;
            if (bitflag)
            {
                highBits = reader.readBits(5);
                writer.writeBits(highBits, 5);
            }
            residueCascade[j] = highBits * 8 + lowBits;
        }

        for (let j = 0; j < residueClassifications; j++)
        {
            for (let k = 0; k < 8; k++)
            {
                if (residueCascade[j] & (1 << k))
                {
                    const residueBook = reader.readBits(8);
                    writer.writeBits(residueBook, 8);
                    if (residueBook >= codebookCount) throw parseError("invalid residue book");
                }
            }
        }
    }

    // mappings
    const mappingCountLess1 = reader.readBits(6);
    const mappingCount = mappingCountLess1 + 1;
    writer.writeBits(mappingCountLess1, 6);
    for (let i = 0; i < mappingCount; i++)
    {
        writer.writeBits(0, 16);

        const submapsFlag = reader.readBits(1);
        writer.writeBits(submapsFlag, 1);
        let submaps = 1;
        if (submapsFlag)
        {
            const submapsLess1 = reader.readBits(4);
            writer.writeBits(submapsLess1, 4);
            submaps = submapsLess1 + 1;
        }

        const squarePolarFlag = reader.readBits(1);
        writer.writeBits(squarePolarFlag, 1);
        if (squarePolarFlag)
        {
            const couplingStepsLess1 = reader.readBits(8);
            writer.writeBits(couplingStepsLess1, 8);
            const couplingBits = ilog(layout.channels - 1);
            for (let j = 0; j < couplingStepsLess1 + 1; j++)
            {
                const magnitude = reader.readBits(couplingBits);
                const angle = reader.readBits(couplingBits);
                writer.writeBits(magnitude, couplingBits);
                writer.writeBits(angle, couplingBits);
                if (angle === magnitude || magnitude >= layout.channels || angle >= layout.channels)
                {
                    throw parseError("invalid coupling");
                }
            }
        }

        const mappingReserved = reader.readBits(2);
        writer.writeBits(mappingReserved, 2);
        if (mappingReserved !== 0) throw parseError("mapping reserved field nonzero");

        if (submaps > 1)
        {
            for (let j = 0; j < layout.channels; j++)
            {
                const mappingMux = reader.readBits(4);
                writer.writeBits(mappingMux, 4);
                if (mappingMux >= submaps) throw parseError("mapping_mux >= submaps");
            }
        }

        for (let j = 0; j < submaps; j++)
        {
            writer.writeBits(reader.readBits(8), 8);
            const floorNumber = reader.readBits(8);
            writer.writeBits(floorNumber, 8);
            if (floorNumber >= floorCount) throw parseError("invalid floor mapping");
            const residueNumber = reader.readBits(8);
            writer.writeBits(residueNumber, 8);
            if (residueNumber >= residueCount) throw parseError("invalid residue mapping");
        }
    }

    // modes
    const modeCountLess1 = reader.readBits(6);
    const modeCount = modeCountLess1 + 1;
    writer.writeBits(modeCountLess1, 6);

    const modeBlockflag = new Array(modeCount);
    const modeBits = ilog(modeCount - 1);
    for (let i = 0; i < modeCount; i++)
    {
        const blockFlag = reader.readBits(1);
        writer.writeBits(blockFlag, 1);
        modeBlockflag[i] = blockFlag !== 0;

        writer.writeBits(0, 16);
        writer.writeBits(0, 16);
        const mapping = reader.readBits(8);
        writer.writeBits(mapping, 8);
        if (mapping >= mappingCount) throw parseError("invalid mode mapping");
    }

    writer.writeBits(1, 1);
    writer.flushPage();

    if (Math.floor((reader.totalBitsRead + 7) / 8) !== setupHeader.size)
    {
        throw parseError("didn't read exactly setup packet");
    }
    if (setupHeader.nextOffset !== layout.dataOffset + layout.firstAudioPacketOffset)
    {
        throw parseError("first audio packet doesn't follow setup packet");
    }

    return { modeBlockflag, modeBits };
}

/**
 * Repack a Wwise Vorbis wem into a standard Ogg Vorbis stream.
 *
 * @param {Uint8Array} bytes Wem bytes (RIFF/RIFX with 0xFFFF Vorbis fmt).
 * @param {object} [options] Options.
 * @param {Uint8Array} [options.codebooks] Packed codebook library override
 *   (defaults to the bundled aoTuV 6.03 library).
 * @returns {object} `{ bytes, sampleCount, sampleRate, channels, durationSeconds, loop, pageCount, modPackets }`.
 */
export function convertWemToOgg(bytes, options = {})
{
    const layout = parseWemVorbisLayout(bytes);
    const library = parseCodebookLibrary(options.codebooks || getPackedCodebooksAotuv603());
    const writer = new OggPageWriter();

    const { modeBlockflag, modeBits } = generateHeaders(bytes, layout, library, writer);

    const blocksize0 = 1 << layout.blocksize0Pow;
    const blocksize1 = 1 << layout.blocksize1Pow;
    const dataEnd = layout.dataOffset + layout.dataSize;

    let offset = layout.dataOffset + layout.firstAudioPacketOffset;
    let prevBlockflag = false;
    let prevBlocksize = 0;
    let granule = 0;
    let lastWemGranule = 0;

    while (offset < dataEnd)
    {
        const packet = readPacketHeader(bytes, offset, layout);
        if (packet.nextOffset > dataEnd) throw parseError("packet truncated");
        if (packet.size === 0) throw parseError("empty audio packet");

        const payload = bytes.subarray(packet.payloadOffset, packet.payloadOffset + packet.size);
        const payloadReader = new BitReader(payload);
        const isLast = packet.nextOffset >= dataEnd;

        let modeNumber;
        if (layout.modPackets)
        {
            // rebuild the packet type and window bits Wwise strips
            writer.writeBits(0, 1);

            modeNumber = payloadReader.readBits(modeBits);
            writer.writeBits(modeNumber, modeBits);
            const remainder = payloadReader.readBits(8 - modeBits);

            if (modeBlockflag[modeNumber])
            {
                let nextBlockflag = false;
                if (!isLast)
                {
                    const nextPacket = readPacketHeader(bytes, packet.nextOffset, layout);
                    if (nextPacket.size > 0)
                    {
                        const nextReader = new BitReader(bytes, nextPacket.payloadOffset);
                        nextBlockflag = modeBlockflag[nextReader.readBits(modeBits)];
                    }
                }
                writer.writeBits(prevBlockflag ? 1 : 0, 1);
                writer.writeBits(nextBlockflag ? 1 : 0, 1);
            }
            prevBlockflag = modeBlockflag[modeNumber];
            writer.writeBits(remainder, 8 - modeBits);

            for (let i = 1; i < packet.size; i++)
            {
                writer.writeBits(payload[i], 8);
            }
        }
        else
        {
            // standard packet: copy verbatim, peek the mode for granule math
            const packetType = payloadReader.readBits(1);
            modeNumber = payloadReader.readBits(modeBits);
            if (packetType !== 0) throw parseError("audio packet is not type 0");

            for (let i = 0; i < packet.size; i++)
            {
                writer.writeBits(payload[i], 8);
            }
        }

        const blocksize = modeBlockflag[modeNumber] ? blocksize1 : blocksize0;
        if (prevBlocksize !== 0)
        {
            granule += (prevBlocksize + blocksize) >> 2;
        }
        prevBlocksize = blocksize;
        if (packet.granule) lastWemGranule = packet.granule;

        writer.setGranule(isLast ? Math.min(granule, layout.sampleCount) : granule);
        writer.flushPage(isLast);
        offset = packet.nextOffset;
    }
    if (offset > dataEnd) throw parseError("page truncated");

    return {
        bytes: writer.toBytes(),
        sampleCount: layout.sampleCount,
        sampleRate: layout.sampleRate,
        channels: layout.channels,
        durationSeconds: layout.sampleRate ? layout.sampleCount / layout.sampleRate : 0,
        loop: layout.loop,
        pageCount: writer.pageCount,
        modPackets: layout.modPackets,
        computedGranule: granule,
        lastWemGranule
    };
}

function readU16LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

function readU16BE(bytes, offset)
{
    return (bytes[offset] << 8) | bytes[offset + 1];
}

function readU32BE(bytes, offset)
{
    return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}
