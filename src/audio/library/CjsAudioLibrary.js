import { installAudioLibraryDocument } from "./audioLibraryDocument.js";
import { decompressGzipIfNeeded } from "#utils/compression";
import {
    createAudioResourceReader,
    normalizeAudioResourceBytes,
} from "../library-builder/resourceSource.js";

const TEXT_DECODER = new TextDecoder();

/** Immutable hydrated audio-library value with the shared model export seam. */
export class CjsAudioLibrary
{
    /** Creates an immutable library from one validated schema-v2 document. */
    constructor(values)
    {
        Object.assign(this, installAudioLibraryDocument(values));
        Object.freeze(this);
    }

    /** Hydrates imported, fetched, or freshly built audio-library values. */
    static from(values)
    {
        return new this(values instanceof CjsAudioLibrary
            ? values.GetValues()
            : values);
    }

    /** Loads plain or gzip-compressed JSON bytes, using fetch for a path by default. */
    static async load(source, options = {})
    {
        const bytes = typeof source === "string"
            ? await createAudioResourceReader(options)(source, {
                kind: "audioLibrary",
                signal: options.signal ?? null,
            })
            : await normalizeAudioResourceBytes(source, "audio library");
        const jsonBytes = await decompressGzipIfNeeded(
            bytes,
            options.compression ?? {},
        );
        let values;

        try
        {
            values = JSON.parse(TEXT_DECODER.decode(jsonBytes));
        }
        catch (error)
        {
            throw new TypeError("Audio library source is not valid JSON", {
                cause: error,
            });
        }

        return this.from(values);
    }

    /** Returns detached JSON-compatible values for persistence or transport. */
    GetValues()
    {
        return JSON.parse(JSON.stringify(this));
    }
}

export default CjsAudioLibrary;
