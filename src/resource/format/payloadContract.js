import { assertNonEmptyString, assertPlainObject, assertPositiveInteger } from "#utils/validation";
/**
 * The `payloadType` vocabulary shared by the format readers and the resources
 * they populate, plus validators for the shapes that carry structure worth
 * checking.
 *
 * THIS FILE IS NOT A CROSS-PACKAGE CONTRACT, whatever it used to say. Every
 * reader lives in this package, and not one of them imports this vocabulary:
 * all nineteen spell their `payloadType` as a bare string literal or a local
 * `OUTPUT_*` constant. The declaration and the spelling drifted apart exactly
 * as you would expect - the enum named five values while readers were emitting
 * eleven, and the missing one used most often was `raw`, which is the default
 * return of nearly every reader.
 *
 * A source scan was tried as the drift guard and abandoned: its first run
 * reported `dds` and `video-frame` as new vocabulary, when one was the
 * CONDITION of a ternary and the other a capability variant marked
 * `supported: false`. Nothing reading reader source as text can tell a payload
 * from a record describing what a payload could have been, so the vocabulary is
 * stated here and checked by eye.
 *
 * Validation is deliberately partial. `validateRgbaPayload`,
 * `validateTexturePayload`, `validateAudioPayload` and `validateVideoPayload`
 * check payloads whose fields have to agree with each other - strides against
 * widths, subresource extents against buffer length - because those are wrong
 * in ways a type cannot catch. The rest carry bytes and a source format, and
 * there is nothing to cross-check.
 */

/**
 * Every `payloadType` that reaches a resource through `CjsResMan`.
 *
 * `RAW` and `MEDIA` were the additions. `RAW` is the one that mattered: it is
 * the default return of nearly every reader in this package, and it had gone
 * unnamed here since the file was written.
 *
 * The debug emits are deliberately absent. `fbxJson`, `ddsJson`, `wavJson` and
 * the rest are asked of a format directly, and the inspection records tagged
 * `image`, `geometry` or `container` are descriptions of what a reader found
 * rather than something it decoded. None of them is part of the manager's
 * normal traffic.
 *
 * Not that they are unreachable. A caller who asks the manager for a `json`
 * emit gets the inspection record published as the payload, because the
 * manager publishes whatever the reader returned. That is a hole in the emit
 * contract rather than a reason to widen this vocabulary, and it is written
 * down here so the next person to meet an `image` payload knows it arrived by
 * request and not by accident.
 */
export const ResourcePayloadType = Object.freeze({
    RAW: "raw",
    RGBA: "rgba",
    TEXTURE: "texture",
    AUDIO: "audio",
    PCM: "pcm",
    VIDEO: "video",
    MEDIA: "media"
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
    const value = assertPlainObject(payload, "RGBA payload");
    assertPayloadType(value, ResourcePayloadType.RGBA, "RGBA payload");
    assertDimensions(value, "RGBA payload");
    assertNonEmptyString(value.pixelFormat, "RGBA payload.pixelFormat");
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
    const value = assertPlainObject(payload, "Texture payload");
    assertPayloadType(value, ResourcePayloadType.TEXTURE, "Texture payload");
    assertDimensions(value, "Texture payload");
    assertEnum(value.dimension, ResourcePayloadValues.textureDimensions, "Texture payload.dimension");
    assertNonEmptyString(value.pixelFormat, "Texture payload.pixelFormat");
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
    const value = assertPlainObject(payload, "Audio payload");
    if (![ ResourcePayloadType.AUDIO, ResourcePayloadType.PCM ].includes(value.payloadType))
    {
        throw new TypeError("Audio payload.payloadType must be \"audio\" or \"pcm\".");
    }
    assertPositiveInteger(value.sampleRate, "Audio payload.sampleRate");
    assertPositiveInteger(value.channels, "Audio payload.channels");
    assertPositiveOrZeroInteger(value.frameCount, "Audio payload.frameCount");
    assertNonEmptyString(value.sampleFormat, "Audio payload.sampleFormat");
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
    const value = assertPlainObject(payload, "Video payload");
    assertPayloadType(value, ResourcePayloadType.VIDEO, "Video payload");
    assertNonEmptyString(value.sourceFormat, "Video payload.sourceFormat");
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
    assertPlainObject(value, prefix);
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

function assertEnum(value, allowed, label)
{
    if (!allowed.includes(value))
    {
        throw new TypeError(`${label} must be one of: ${allowed.join(", ")}.`);
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
