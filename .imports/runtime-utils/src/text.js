import { asUint8Array } from "./bytes.js";

/** Encodes a value as UTF-8 without importing a platform-specific module. */
export function encodeUtf8(value)
{
    const TextEncoderClass = globalThis.TextEncoder;

    if (typeof TextEncoderClass !== "function")
    {
        throw unsupportedTextCodec("TextEncoder");
    }

    return new TextEncoderClass().encode(String(value));
}

/** Decodes supported byte input as UTF-8. */
export function decodeUtf8(value, options = {})
{
    const TextDecoderClass = globalThis.TextDecoder;

    if (typeof TextDecoderClass !== "function")
    {
        throw unsupportedTextCodec("TextDecoder");
    }

    const decoder = new TextDecoderClass("utf-8", {
        fatal: Boolean(options.fatal),
        ignoreBOM: Boolean(options.ignoreBOM)
    });

    return decoder.decode(asUint8Array(value, "UTF-8 input"));
}

function unsupportedTextCodec(name)
{
    const error = new Error(`${name} is unavailable in this environment.`);

    error.code = "CJS_TEXT_CODEC_UNSUPPORTED";
    return error;
}
