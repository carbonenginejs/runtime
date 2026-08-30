/**
 * Return the encoded byte width of one CMF vertex element component.
 *
 * @param {string} type CMF ElementType name.
 * @returns {number} Encoded component size in bytes.
 */
export function elementTypeSize(type)
{
    switch (type)
    {
        case "Float32":
            return 4;
        case "Float16":
        case "UInt16Norm":
        case "UInt16":
        case "Int16Norm":
        case "Int16":
            return 2;
        case "UInt8Norm":
        case "UInt8":
        case "Int8Norm":
        case "Int8":
            return 1;
        default:
            throw new Error(`Unsupported CMF vertex element type "${type}"`);
    }
}

/**
 * Calculate the byte stride required by a CMF vertex declaration.
 *
 * @param {Array<object>} decl CMF vertex elements.
 * @returns {number} Required stride in bytes.
 */
export function estimateStrideFromDecl(decl = [])
{
    let stride = 0;
    for (const element of decl)
    {
        stride = Math.max(
            stride,
            (element.offset || 0) + element.elementCount * elementTypeSize(element.type)
        );
    }
    return stride;
}

/** Decode one IEEE-754 binary16 value. */
export function halfToFloat(value)
{
    const
        sign = (value & 0x8000) ? -1 : 1,
        exponent = (value >> 10) & 0x1f,
        fraction = value & 0x03ff;

    if (exponent === 0) return sign * Math.pow(2, -14) * (fraction / 1024);
    if (exponent === 31) return fraction ? NaN : sign * Infinity;
    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

/** Decode one CMF element component from a DataView. */
export function readElementComponent(view, offset, type)
{
    switch (type)
    {
        case "Float32": return view.getFloat32(offset, true);
        case "Float16": return halfToFloat(view.getUint16(offset, true));
        case "UInt16Norm": return view.getUint16(offset, true) / 65535;
        case "UInt16": return view.getUint16(offset, true);
        case "Int16Norm": return Math.max(view.getInt16(offset, true) / 32767, -1);
        case "Int16": return view.getInt16(offset, true);
        case "UInt8Norm": return view.getUint8(offset) / 255;
        case "UInt8": return view.getUint8(offset);
        case "Int8Norm": return Math.max(view.getInt8(offset) / 127, -1);
        case "Int8": return view.getInt8(offset);
        default: throw new Error(`Unsupported CMF vertex element type "${type}"`);
    }
}

/** Decode a tightly-packed CMF element byte array to JavaScript numbers. */
export function decodeElementArray(input, type)
{
    const bytes = input instanceof Uint8Array
        ? input
        : ArrayBuffer.isView(input)
            ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
            : input instanceof ArrayBuffer
                ? new Uint8Array(input)
                : Uint8Array.from(input || []);
    const size = elementTypeSize(type);
    if (bytes.byteLength % size)
    {
        throw new Error(`CMF ${type} byte array length ${bytes.byteLength} is not divisible by ${size}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const values = new Array(bytes.byteLength / size);
    for (let i = 0; i < values.length; i++) values[i] = readElementComponent(view, i * size, type);
    return values;
}
