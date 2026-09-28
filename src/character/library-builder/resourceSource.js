import { blue } from "#blue";

/**
 * Creates the byte reader for a library build: an injected `source` when one
 * is given (tools-core reads from disk that way), otherwise blue's ResMan and
 * whatever source it is configured with.
 */
export function createCharacterResourceReader(options = {})
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
                "Character resource source must be a function or expose read, Read, or Fetch"
            );
        }

        return async (path, context = {}) => normalizeResourceBytes(
            await read.call(typeof source === "function" ? null : source, path, context),
            path
        );
    }

    return async (path, context = {}) => normalizeResourceBytes(
        await blue.resMan.ReadResource(path, context.signal ? { signal: context.signal } : {}),
        path
    );
}

async function normalizeResourceBytes(value, path)
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

    throw new TypeError(`Character resource source returned no bytes for ${path}`);
}
