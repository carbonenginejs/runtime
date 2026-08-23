import { CjsFileIndex } from "./CjsFileIndex.js";
import { CjsFileIndexSource } from "./CjsFileIndexSource.js";

/** One caller-supplied manual replacement or fallback resfileindex layer. */
export class CjsFileIndexOverlay
{

    /**
     * Wraps one caller-supplied resfileindex as a named layer and freezes it; the
     * index must be res-rooted, and the mode fixes precedence for the layer's
     * whole lifetime.
     * @param {string} mode "override" wins over the official indexes, "fallback"
     * loses to them.
     * @param {string|null} sourceID Source used for entries whose location carries
     * no source prefix; null defers to the library's "default" source.
     */
    constructor({ name, mode = "fallback", index, sourceID = null })
    {
        this.name = CjsFileIndexOverlay.normalizeName(name);
        this.mode = CjsFileIndexOverlay.normalizeMode(mode);

        if (!(index instanceof CjsFileIndex) || index.root !== "res")
        {
            throw new TypeError("File-index overlays require a resfileindex.");
        }

        this.index = index;
        this.sourceID = sourceID === null
            ? null
            : CjsFileIndexSource.normalizeID(sourceID);

        Object.freeze(this);
    }

    /**
     * Returns the entry this overlay declares for the path, or null; an overlay
     * never consults another layer, so precedence is the library's job.
     */
    Find(logicalPath)
    {
        return this.index.Find(logicalPath);
    }

    /**
     * Reports whether this overlay declares the path, which is what decides
     * whether its mode gets a chance to win.
     */
    Has(logicalPath)
    {
        return this.index.Has(logicalPath);
    }

    /**
     * Parses resfileindex text straight into an overlay, applying the overlay
     * name to the wrapped index as well so both report the same layer name.
     */
    static parse(text, options = {})
    {
        return new CjsFileIndexOverlay({
            name: options.name,
            mode: options.mode,
            sourceID: options.sourceID,
            index: CjsFileIndex.parseResFileIndex(text, {
                name: options.name,
                sourceURL: options.sourceURL
            })
        });
    }

    /**
     * Lowercases and validates a layer name; the library applies this same rule
     * to loaded index names, so the two namespaces cannot collide.
     */
    static normalizeName(value)
    {
        const name = String(value ?? "").trim().toLowerCase();

        if (!/^[a-z0-9][a-z0-9._-]*$/u.test(name))
        {
            throw new TypeError(`Invalid file-index overlay name: ${value}`);
        }

        return name;
    }

    /**
     * Accepts only "override" or "fallback"; there is no default precedence for
     * an unrecognized mode.
     */
    static normalizeMode(value)
    {
        const mode = String(value ?? "").trim().toLowerCase();

        if (mode !== "override" && mode !== "fallback")
        {
            throw new TypeError(`Invalid file-index overlay mode: ${value}`);
        }

        return mode;
    }

}
