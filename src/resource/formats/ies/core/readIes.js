import { asUint8Array } from "#utils/bytes";

// Numeric field order and TILT=NONE support follow Carbon's
// trinity/Resources/Tr2LightProfileRes.cpp, ParseIes. Reading retains every
// horizontal slice; selecting a slice and generating a light texture are
// deliberately outside this byte reader.
const HEADER_FIELDS = Object.freeze([
    "lampCount", "lumensPerLamp", "candelaMultiplier", "verticalAngleCount",
    "horizontalAngleCount", "photometricType", "unitsType", "width", "length",
    "height", "ballastFactor", "futureUse", "inputWatts"
]);
const INTEGER_FIELDS = new Set([
    "lampCount", "verticalAngleCount", "horizontalAngleCount", "photometricType", "unitsType"
]);
const NUMBER = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/u;

/**
 * Parses the supported IES text container from a byte view.
 * @param {ArrayBuffer|ArrayBufferView} input File bytes, respecting view offsets.
 * @param {object} [options] Source label and output selection.
 * @returns {object} Raw photometric fields and horizontal-major candela table.
 */
export function readIes(input, options = {})
{
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError("CjsIESFormat: options must be an object");
    }
    for (const key of Object.keys(options))
    {
        if (key !== "source" && key !== "emit") throw new TypeError(`CjsIESFormat: unknown option ${key}`);
    }
    if (options.emit !== undefined && options.emit !== "payload")
    {
        throw new TypeError(`CjsIESFormat: unknown emit value ${options.emit}`);
    }
    const fail = message =>
    {
        throw new TypeError(`CjsIESFormat${options.source ? ` (${options.source})` : ""}: ${message}`);
    };
    let text;
    try
    {
        text = new TextDecoder("utf-8", { fatal: true }).decode(asUint8Array(input, "IES input"));
    }
    catch
    {
        return fail("expected UTF-8 IES bytes");
    }
    const tilt = /^TILT[ \t]*=[ \t]*([^\r\n]*)[\r\n]/mu.exec(text);
    if (!tilt) return fail("missing TILT declaration");
    const tiltValue = tilt[1].trim();
    if (tiltValue !== "NONE") return fail(`unsupported TILT=${tiltValue}; expected TILT=NONE`);

    const headerText = text.slice(0, tilt.index).trimEnd();
    const tokens = text.slice(tilt.index + tilt[0].length).trim().split(/[\s,]+/u);
    if (tokens.length < HEADER_FIELDS.length) return fail("truncated photometric header");
    const numberAt = index =>
    {
        const token = tokens[index];
        if (token === undefined || !NUMBER.test(token) || !Number.isFinite(Number(token)))
        {
            return fail(`invalid number at numeric field ${index}`);
        }
        return Number(token);
    };
    const header = {};
    for (let i = 0; i < HEADER_FIELDS.length; i++)
    {
        const name = HEADER_FIELDS[i];
        const value = numberAt(i);
        if (INTEGER_FIELDS.has(name) && !Number.isSafeInteger(value)) return fail(`invalid integer ${name}`);
        header[name] = value;
    }
    const { verticalAngleCount, horizontalAngleCount } = header;
    if (verticalAngleCount < 1 || horizontalAngleCount < 1) return fail("angle counts must be positive");
    const valueCount = verticalAngleCount * horizontalAngleCount;
    const end = HEADER_FIELDS.length + verticalAngleCount + horizontalAngleCount + valueCount;
    // Validate before allocating arrays: counts come from untrusted file bytes.
    if (!Number.isSafeInteger(end) || end > tokens.length) return fail("truncated angle or candela table");
    if (end !== tokens.length) return fail("unexpected trailing numeric data");
    let cursor = HEADER_FIELDS.length;
    const readValues = count =>
    {
        const result = new Array(count);
        for (let i = 0; i < count; i++) result[i] = numberAt(cursor++);
        return result;
    };
    return {
        headerText,
        tilt: tiltValue,
        ...header,
        verticalAngles: readValues(verticalAngleCount),
        horizontalAngles: readValues(horizontalAngleCount),
        candelaValues: readValues(valueCount)
    };
}
