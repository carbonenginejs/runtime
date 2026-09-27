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

/**
 * Parses a decimal prefix using Carbon's std::stoull conversion semantics.
 *
 * Leading whitespace and an optional sign are accepted; trailing characters
 * are ignored. The magnitude must fit uint64 before a negative sign is applied
 * modulo 2^64. This is a prefix parser, not a whole-field integer validator.
 *
 * @param {string} value Decimal source text.
 * @returns {bigint} Unsigned 64-bit integer, without Number precision loss.
 * @throws {SyntaxError} If no decimal prefix is present.
 * @throws {RangeError} If the magnitude exceeds uint64.
 */
export function parseUint64Prefix(value)
{
    const match = String(value).match(/^\s*([+-]?)(\d+)/u);
    if (!match) throw new SyntaxError("Invalid unsigned integer prefix");
    const integer = BigInt(match[2]);
    if (integer > 18446744073709551615n) throw new RangeError("Integer magnitude exceeds uint64");
    return match[1] === "-" ? BigInt.asUintN(64, -integer) : integer;
}
