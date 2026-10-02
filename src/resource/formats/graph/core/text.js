import { isRecord } from "./dataTypes.js";

/** Read caller bytes respecting sliced views; never access bytes outside the input. */
export function bytes(input)
{
    if (input instanceof ArrayBuffer) return new Uint8Array(input); // alloc: returned byte view of caller storage, no payload allocation.
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength); // alloc: returned bounded byte view, no payload allocation.
    throw new TypeError("Expected ArrayBuffer or byte view");
}

/** Parse only our explicit file envelope, never infer a format from an extension. */
export function readEnvelope(input, format)
{
    const text = typeof input === "string" ? input : new TextDecoder("utf-8", { fatal: true }).decode(bytes(input));
    const envelope = JSON.parse(text);
    if (!isRecord(envelope) || envelope.format !== format) throw new TypeError(`Expected format '${format}'`);
    if (envelope.version !== 1) throw new RangeError(`Unsupported ${format} version '${envelope.version}'`);
    return envelope;
}

/** Encode text without changing BigInts, nonfinite numbers or opaque bytes implicitly. */
export function writeEnvelope(envelope)
{
    return new TextEncoder().encode(JSON.stringify(envelope));
}

/** Explicit per-format opaque opt-in; no global custom-type reader exists. */
export function opaqueBytes(name)
{
    if (typeof name !== "string" || !name) throw new TypeError("Opaque handler needs a name");
    return {
        write(value, context)
        {
            if (!(value instanceof Uint8Array)) throw new TypeError(`Custom '${name}' requires Uint8Array`);
            if (context.options.binary) return { _custom: name, _view: context.options.binary.write(value, "bytes") };
            const chunks = [];
            for (let offset = 0; offset < value.length; offset += 8192)
            {
                let part = "";
                for (let index = offset; index < Math.min(offset + 8192, value.length); index++) part += String.fromCharCode(value[index]);
                chunks.push(part);
            }
            return { _custom: name, base64: btoa(chunks.join("")) };
        },
        read(value, context)
        {
            if (!isRecord(value) || value._custom !== name) throw new TypeError(`Expected custom '${name}'`);
            if (context.options.binary)
            {
                if (Object.keys(value).length !== 2) throw new TypeError("Invalid opaque view wrapper");
                return context.options.binary.read(value._view, "bytes");
            }
            if (Object.keys(value).length !== 2 || typeof value.base64 !== "string") throw new TypeError("Invalid opaque base64 wrapper");
            const decoded = atob(value.base64);
            if (btoa(decoded) !== value.base64) throw new TypeError("Noncanonical base64");
            const result = new Uint8Array(decoded.length); // alloc: variable-length opaque payload returned with owned storage.
            for (let index = 0; index < decoded.length; index++) result[index] = decoded.charCodeAt(index);
            return result;
        }
    };
}
