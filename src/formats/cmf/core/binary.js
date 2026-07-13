const textDecoder = new TextDecoder();

export function asUint8Array(input)
{
    if (input instanceof Uint8Array)
    {
        return input;
    }

    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }

    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    throw new TypeError("CMF input must be a Uint8Array, Buffer, ArrayBuffer, or typed-array view");
}

export class BinaryReader
{
    constructor(bytes)
    {
        this.bytes = asUint8Array(bytes);
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    }

    require(offset, size, label = "read")
    {
        if (!Number.isInteger(offset) || offset < 0 || offset + size > this.bytes.byteLength)
        {
            throw new RangeError(`CMF ${label} is outside file bounds`);
        }
    }

    u8(offset)
    {
        this.require(offset, 1);
        return this.view.getUint8(offset);
    }

    u16(offset)
    {
        this.require(offset, 2);
        return this.view.getUint16(offset, true);
    }

    u32(offset)
    {
        this.require(offset, 4);
        return this.view.getUint32(offset, true);
    }

    i32(offset)
    {
        this.require(offset, 4);
        return this.view.getInt32(offset, true);
    }

    f32(offset)
    {
        this.require(offset, 4);
        return this.view.getFloat32(offset, true);
    }

    u64(offset)
    {
        this.require(offset, 8);
        const value = this.view.getBigUint64(offset, true);
        if (value > BigInt(Number.MAX_SAFE_INTEGER))
        {
            throw new RangeError("CMF integer is larger than Number.MAX_SAFE_INTEGER");
        }
        return Number(value);
    }

    i64(offset)
    {
        this.require(offset, 8);
        const value = this.view.getBigInt64(offset, true);
        if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
        {
            throw new RangeError("CMF integer is outside the safe JavaScript number range");
        }
        return Number(value);
    }

    bytesAt(offset, size)
    {
        this.require(offset, size, "byte slice");
        return this.bytes.subarray(offset, offset + size);
    }

    string(offset, byteSize)
    {
        if (byteSize === 0)
        {
            return "";
        }

        return textDecoder.decode(this.bytesAt(offset, byteSize));
    }
}

export function enumName(names, value)
{
    return names[value] ?? `Unknown(${value})`;
}

export function readVector3(reader, offset)
{
    return [
        reader.f32(offset),
        reader.f32(offset + 4),
        reader.f32(offset + 8)
    ];
}

export function readQuaternion(reader, offset)
{
    return [
        reader.f32(offset),
        reader.f32(offset + 4),
        reader.f32(offset + 8),
        reader.f32(offset + 12)
    ];
}

export function readMatrix(reader, offset)
{
    const values = [];
    for (let i = 0; i < 16; i++)
    {
        values.push(reader.f32(offset + i * 4));
    }
    return values;
}

export function readBounds(reader, offset)
{
    return {
        min: readVector3(reader, offset),
        max: readVector3(reader, offset + 12)
    };
}

export function crc32(bytes, start = 0, end = bytes.byteLength)
{
    let crc = 0xffffffff;
    const table = crc32Table();
    for (let i = start; i < end; i++)
    {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}

let cachedCrc32Table = null;

function crc32Table()
{
    if (cachedCrc32Table)
    {
        return cachedCrc32Table;
    }

    cachedCrc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++)
    {
        let c = i;
        for (let k = 0; k < 8; k++)
        {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        cachedCrc32Table[i] = c >>> 0;
    }
    return cachedCrc32Table;
}
