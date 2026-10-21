import { blue } from "#blue";

const TEXT_DECODER = new TextDecoder();

/**
 * Creates the byte reader for a library build: an injected `source` when one
 * is given (tools-core reads from disk that way), otherwise blue's ResMan and
 * whatever source it is configured with.
 */
export function createAudioResourceReader(options = {})
{
    const source = options.source ?? options.read ?? null;

    if (source !== null)
    {
        const read = typeof source === "function"
            ? source
            : source.read ?? source.Read ?? source.Fetch;

        if (typeof read !== "function")
        {
            throw new TypeError(
                "Audio resource source must be a function or expose read, Read, or Fetch",
            );
        }

        return async (path, context = {}) => normalizeAudioResourceBytes(
            await read.call(typeof source === "function" ? null : source, path, context),
            path,
        );
    }

    return async (path, context = {}) => normalizeAudioResourceBytes(
        await blue.resMan.ReadResource(path, context.signal ? { signal: context.signal } : {}),
        path,
    );
}

/** Decodes one caller-supplied index payload without assuming Node Buffer. */
export function decodeAudioResourceText(bytes)
{
    return TEXT_DECODER.decode(bytes);
}

/** Decodes one caller-supplied JSON payload without assuming Node Buffer. */
export function decodeAudioResourceJson(bytes, path)
{
    try
    {
        return JSON.parse(decodeAudioResourceText(bytes));
    }
    catch (error)
    {
        throw new TypeError(`Audio resource is not valid JSON: ${path}`, {
            cause: error,
        });
    }
}

/**
 * Normalizes a fetch response, byte wrapper, or buffer view to a Uint8Array
 * window.
 */
export async function normalizeAudioResourceBytes(value, path)
{
    let input = value;

    if (input && typeof input.arrayBuffer === "function")
    {
        input = await input.arrayBuffer();
    }
    else if (input && typeof input === "object" && "bytes" in input)
    {
        input = input.bytes;
    }

    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }
    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    throw new TypeError(`Audio resource source returned no bytes for ${path}`);
}
