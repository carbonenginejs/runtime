import { asUint8Array, hasBytePrefix } from "./bytes.js";

const GZIP_PREFIX = new Uint8Array([ 0x1f, 0x8b ]);

/** Returns whether byte input has the gzip magic prefix. */
export function isGzip(value)
{
    return hasBytePrefix(value, GZIP_PREFIX);
}

/** Decompresses bytes with the platform DecompressionStream API. */
export async function decompressBytes(value, format, options = {})
{
    const DecompressionStreamClass = Object.hasOwn(options, "decompressionStreamClass")
        ? options.decompressionStreamClass
        : globalThis.DecompressionStream;
    const ResponseClass = Object.hasOwn(options, "responseClass")
        ? options.responseClass
        : globalThis.Response;

    if (typeof DecompressionStreamClass !== "function" || typeof ResponseClass !== "function")
    {
        const error = new Error(
            `DecompressionStream support for ${JSON.stringify(format)} is unavailable in this environment.`
        );

        error.code = "CJS_DECOMPRESSION_UNSUPPORTED";
        throw error;
    }

    const source = new ResponseClass(asUint8Array(value, "compressed input"));

    if (!source.body)
    {
        throw new Error("The platform Response did not expose a readable byte stream.");
    }

    const stream = source.body.pipeThrough(new DecompressionStreamClass(String(format)));
    const output = await new ResponseClass(stream).arrayBuffer();

    return new Uint8Array(output);
}

/** Decompresses one gzip byte sequence. */
export function decompressGzip(value, options = {})
{
    return decompressBytes(value, "gzip", options);
}

/** Decompresses gzip input and returns an unchanged view for plain bytes. */
export function decompressGzipIfNeeded(value, options = {})
{
    const bytes = asUint8Array(value, "input");

    return isGzip(bytes) ? decompressGzip(bytes, options) : Promise.resolve(bytes);
}
