import { CjsSchema } from "#schema";

import { installAudioLibraryDocument } from "./audioLibraryDocument.js";
import { decompressGzipIfNeeded } from "#utils/compression";
import {
    createAudioResourceReader,
    normalizeAudioResourceBytes,
} from "../library-builder/resourceSource.js";

const TEXT_DECODER = new TextDecoder();

/**
 * The document sections a schema-v2 audio library may leave out, in the order
 * the builder writes them. A section the document did not hold is `null` on
 * the instance and absent from GetValues.
 */
const OPTIONAL_SECTIONS = [
    "eventMedia",
    "eventMediaLanguage",
    "embeddedMedia",
    "sfx",
    "music",
    "busRtpcs",
    "busStates",
    "busDucking",
    "busEffects",
    "busGraph",
    "sourceTarget",
    "sourceGame",
    "sourceProvider",
    "sourceBuild",
    "generatedAt",
];

/** Immutable hydrated audio-library value with the shared model export seam. */
export class CjsAudioLibrary
{
    /** Document schema name, `carbonenginejs.audioLibrary`. */
    schema = "";

    /** Document schema version (2). */
    schemaVersion = 0;

    /** Event, SoundBank and WEM metadata tables. */
    metadata = null;

    /** Loose media sources by media ID. */
    media = null;

    /** SoundBank sources by `bankID:languageID`. */
    banks = null;

    /** Media IDs per event, or null when the document has none. */
    eventMedia = null;

    /** Language the event media were resolved for, or null. */
    eventMediaLanguage = null;

    /** Media embedded in SoundBanks by media ID, or null. */
    embeddedMedia = null;

    /** Normalized authored SFX graph, or null. */
    sfx = null;

    /** Dynamic-music graph, or null. */
    music = null;

    /** Bus RTPC catalog, or null. */
    busRtpcs = null;

    /** Bus State catalog, or null. */
    busStates = null;

    /** Bus ducking catalog, or null. */
    busDucking = null;

    /** Bus effect catalog, or null. */
    busEffects = null;

    /** Normalized Bus graph catalog, or null. */
    busGraph = null;

    /** Build target the library came from, or null. */
    sourceTarget = null;

    /** Game the library came from, or null. */
    sourceGame = null;

    /** Provider the library came from, or null. */
    sourceProvider = null;

    /** Build the library came from, or null. */
    sourceBuild = null;

    /** ISO time the library was generated, or null. */
    generatedAt = null;

    /**
     * Creates a library from one validated schema-v2 document. Each known
     * section is copied onto its field; a top-level key the schema does not
     * define is not kept.
     */
    constructor(values)
    {
        const document = installAudioLibraryDocument(values);

        this.schema = document.schema;
        this.schemaVersion = document.schemaVersion;
        this.metadata = document.metadata;
        this.media = document.media;
        this.banks = document.banks;

        this.eventMedia = document.eventMedia ?? null;
        this.eventMediaLanguage = document.eventMediaLanguage ?? null;
        this.embeddedMedia = document.embeddedMedia ?? null;
        this.sfx = document.sfx ?? null;
        this.music = document.music ?? null;
        this.busRtpcs = document.busRtpcs ?? null;
        this.busStates = document.busStates ?? null;
        this.busDucking = document.busDucking ?? null;
        this.busEffects = document.busEffects ?? null;
        this.busGraph = document.busGraph ?? null;
        this.sourceTarget = document.sourceTarget ?? null;
        this.sourceGame = document.sourceGame ?? null;
        this.sourceProvider = document.sourceProvider ?? null;
        this.sourceBuild = document.sourceBuild ?? null;
        this.generatedAt = document.generatedAt ?? null;
    }

    /** Hydrates imported, fetched, or freshly built audio-library values. */
    static from(values)
    {
        return new this(values instanceof CjsAudioLibrary
            ? values.GetValues()
            : values);
    }

    /** Loads plain or gzip-compressed JSON bytes, reading a path through be.resMan unless a source is given. */
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

    /**
     * Returns detached JSON-compatible values for persistence or transport:
     * the required sections, then each optional section that is not null, in
     * the builder's order.
     */
    GetValues()
    {
        const values = {
            schema: this.schema,
            schemaVersion: this.schemaVersion,
            metadata: this.metadata,
            media: this.media,
            banks: this.banks,
        };

        for (const section of OPTIONAL_SECTIONS)
        {
            if (this[section] !== null)
            {
                values[section] = this[section];
            }
        }

        return JSON.parse(JSON.stringify(values));
    }
}

export default CjsAudioLibrary;

CjsSchema.meta.define("CjsAudioLibrary")(CjsAudioLibrary);
