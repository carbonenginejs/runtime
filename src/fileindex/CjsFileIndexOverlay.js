import { CjsFileIndex } from "./CjsFileIndex.js";
import { CjsFileIndexSource } from "./CjsFileIndexSource.js";

/** One caller-supplied manual replacement or fallback resfileindex layer. */
export class CjsFileIndexOverlay
{

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

    Find(logicalPath)
    {
        return this.index.Find(logicalPath);
    }

    Has(logicalPath)
    {
        return this.index.Has(logicalPath);
    }

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

    static normalizeName(value)
    {
        const name = String(value ?? "").trim().toLowerCase();

        if (!/^[a-z0-9][a-z0-9._-]*$/u.test(name))
        {
            throw new TypeError(`Invalid file-index overlay name: ${value}`);
        }

        return name;
    }

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
