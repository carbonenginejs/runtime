/**
 * Canonical semantic payload vocabulary shared by runtime-resource adapters
 * and pure format readers.
 *
 * Format packages may return plain objects matching these shapes without
 * importing runtime-resource. These validators are runtime-side guardrails;
 * they are not file decoders or GPU capability checks.
 */

export const ResourcePayloadType = Object.freeze({
    RGBA: "rgba",
    TEXTURE: "texture",
    AUDIO: "audio",
    PCM: "pcm",
    VIDEO: "video"
});

export const ResourcePayloadValues = Object.freeze({
    imageOrigins: Object.freeze([ "top-left" ]),
    colorSpaces: Object.freeze([ "srgb", "linear", "unknown" ]),
    alphaModes: Object.freeze([ "straight", "premultiplied", "opaque", "unknown" ]),
    textureDimensions: Object.freeze([ "2d", "cube", "3d", "array" ])
});

/**
 * Validates dimensions, stride, and byte storage for a decoded RGBA payload for
 * the resource payload contract.
 */
export function validateRgbaPayload(payload, options = null)
{
    const value = assertObject(payload, "RGBA payload");
    assertPayloadType(value, ResourcePayloadType.RGBA, "RGBA payload");
    assertDimensions(value, "RGBA payload");
    assertString(value.pixelFormat, "RGBA payload.pixelFormat");
    const layout = {
        rgba8unorm: { bytesPerPixel: 4, arrayType: Uint8Array },
        rgba32float: { bytesPerPixel: 16, arrayType: Float32Array }
    }[value.pixelFormat];
    if (!layout)
    {
        throw new TypeError("RGBA payload.pixelFormat must be \"rgba8unorm\" or \"rgba32float\".");
    }
    if (!(value.data instanceof layout.arrayType))
    {
        throw new TypeError(`RGBA payload.data must be a ${layout.arrayType.name}.`);
    }
    assertPositiveOrZeroInteger(value.strideBytes, "RGBA payload.strideBytes");
    if (value.strideBytes < value.width * layout.bytesPerPixel)
    {
        throw new RangeError("RGBA payload.strideBytes is smaller than one RGBA row.");
    }
    if (value.data.byteLength < value.strideBytes * value.height)
    {
        throw new RangeError("RGBA payload.data is shorter than the declared image rows.");
    }
    if (value.strideBytes % value.data.BYTES_PER_ELEMENT !== 0)
    {
        throw new RangeError("RGBA payload.strideBytes must align to its typed-array elements.");
    }
    assertEnum(value.origin, ResourcePayloadValues.imageOrigins, "RGBA payload.origin");
    assertEnum(value.colorSpace, ResourcePayloadValues.colorSpaces, "RGBA payload.colorSpace");
    assertEnum(value.alphaMode, ResourcePayloadValues.alphaModes, "RGBA payload.alphaMode");
    if (options?.allowMetadata === false && value.metadata !== undefined)
    {
        throw new TypeError("RGBA payload.metadata is not allowed for this validation mode.");
    }
    return value;
}

/**
 * Validates the discriminated fields required by a texture payload for the
 * resource payload contract.
 */
export function validateTexturePayload(payload)
{
    const value = assertObject(payload, "Texture payload");
    assertPayloadType(value, ResourcePayloadType.TEXTURE, "Texture payload");
    assertDimensions(value, "Texture payload");
    assertEnum(value.dimension, ResourcePayloadValues.textureDimensions, "Texture payload.dimension");
    assertString(value.pixelFormat, "Texture payload.pixelFormat");
    if (typeof value.isCompressed !== "boolean")
    {
        throw new TypeError("Texture payload.isCompressed must be boolean.");
    }
    assertPositiveInteger(value.mipCount, "Texture payload.mipCount");
    assertPositiveInteger(value.arraySize, "Texture payload.arraySize");
    assertBytes(value.data, "Texture payload.data");
    if (!Array.isArray(value.subresources) || value.subresources.length === 0)
    {
        throw new TypeError("Texture payload.subresources must be a non-empty array.");
    }
    for (const [ index, subresource ] of value.subresources.entries())
    {
        validateTextureSubresource(subresource, index, value.data.byteLength);
    }
    return value;
}

/**
 * Validates the discriminated fields required by an audio payload for the
 * resource payload contract.
 */
export function validateAudioPayload(payload)
{
    const value = assertObject(payload, "Audio payload");
    if (![ ResourcePayloadType.AUDIO, ResourcePayloadType.PCM ].includes(value.payloadType))
    {
        throw new TypeError("Audio payload.payloadType must be \"audio\" or \"pcm\".");
    }
    assertPositiveInteger(value.sampleRate, "Audio payload.sampleRate");
    assertPositiveInteger(value.channels, "Audio payload.channels");
    assertPositiveOrZeroInteger(value.frameCount, "Audio payload.frameCount");
    assertString(value.sampleFormat, "Audio payload.sampleFormat");
    assertBytesOrTypedArray(value.data, "Audio payload.data");
    assertPositiveOrZeroNumber(value.durationSeconds, "Audio payload.durationSeconds");
    return value;
}

/**
 * Validates the discriminated fields required by a video payload for the
 * resource payload contract.
 */
export function validateVideoPayload(payload)
{
    const value = assertObject(payload, "Video payload");
    assertPayloadType(value, ResourcePayloadType.VIDEO, "Video payload");
    assertString(value.sourceFormat, "Video payload.sourceFormat");
    assertPositiveInteger(value.durationTimescale, "Video payload.durationTimescale");
    assertPositiveOrZeroInteger(value.duration, "Video payload.duration");
    if (!Array.isArray(value.tracks))
    {
        throw new TypeError("Video payload.tracks must be an array.");
    }
    return value;
}

function validateTextureSubresource(value, index, dataByteLength)
{
    const prefix = `Texture payload.subresources[${index}]`;
    assertObject(value, prefix);
    assertPositiveOrZeroInteger(value.mip, `${prefix}.mip`);
    assertPositiveOrZeroInteger(value.layer, `${prefix}.layer`);
    assertPositiveOrZeroInteger(value.offset, `${prefix}.offset`);
    assertPositiveInteger(value.byteLength, `${prefix}.byteLength`);
    assertPositiveOrZeroInteger(value.width, `${prefix}.width`);
    assertPositiveOrZeroInteger(value.height, `${prefix}.height`);
    assertPositiveOrZeroInteger(value.rowPitch, `${prefix}.rowPitch`);
    assertPositiveOrZeroInteger(value.slicePitch, `${prefix}.slicePitch`);
    if (value.offset + value.byteLength > dataByteLength)
    {
        throw new RangeError(`${prefix} exceeds Texture payload.data.`);
    }
}

function assertObject(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object.`);
    }
    return value;
}

function assertPayloadType(value, expected, label)
{
    if (value.payloadType !== expected)
    {
        throw new TypeError(`${label}.payloadType must be \"${expected}\".`);
    }
}

function assertDimensions(value, label)
{
    assertPositiveInteger(value.width, `${label}.width`);
    assertPositiveInteger(value.height, `${label}.height`);
}

function assertBytes(value, label)
{
    if (!(value instanceof Uint8Array))
    {
        throw new TypeError(`${label} must be a Uint8Array.`);
    }
}

function assertBytesOrTypedArray(value, label)
{
    if (!ArrayBuffer.isView(value) || value instanceof DataView)
    {
        throw new TypeError(`${label} must be a typed array.`);
    }
}

function assertString(value, label)
{
    if (typeof value !== "string" || value.length === 0)
    {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
}

function assertEnum(value, allowed, label)
{
    if (!allowed.includes(value))
    {
        throw new TypeError(`${label} must be one of: ${allowed.join(", ")}.`);
    }
}

function assertPositiveInteger(value, label)
{
    if (!Number.isSafeInteger(value) || value <= 0)
    {
        throw new TypeError(`${label} must be a positive safe integer.`);
    }
}

function assertPositiveOrZeroInteger(value, label)
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw new TypeError(`${label} must be a non-negative safe integer.`);
    }
}

function assertPositiveOrZeroNumber(value, label)
{
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    {
        throw new TypeError(`${label} must be a non-negative finite number.`);
    }
}
