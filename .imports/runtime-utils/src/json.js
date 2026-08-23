import { decodeUtf8, encodeUtf8 } from "./text.js";

/** Encodes JSON with explicit indentation and trailing-newline behavior. */
export function encodeJson(value, options = {})
{
    const space = options.space ?? 2;
    const text = JSON.stringify(value, options.replacer ?? null, space);

    if (text === undefined)
    {
        throw new TypeError("JSON input is not serializable as a top-level value.");
    }

    return encodeUtf8(options.trailingNewline === false ? text : `${text}\n`);
}

/** Decodes JSON from a string or UTF-8 byte input. */
export function decodeJson(value, options = {})
{
    const text = typeof value === "string" ? value : decodeUtf8(value, options);

    return JSON.parse(text, options.reviver);
}
