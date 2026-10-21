import { CjsSchema, blue, meta } from "#schema";
import { IRoot } from "../global/blue/IRoot.js";
// Source: trinity/trinity/UI/Tr2MouseCursor.h
// Source: trinity/trinity/UI/Tr2MouseCursor.cpp
// Source: trinity/trinity/UI/Tr2MouseCursor_Blue.cpp

const CSS_CURSOR_KEYWORDS = new Set([
    "auto", "default", "none", "context-menu", "help", "pointer", "progress", "wait",
    "cell", "crosshair", "text", "vertical-text", "alias", "copy", "move", "no-drop",
    "not-allowed", "grab", "grabbing", "all-scroll", "col-resize", "row-resize",
    "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize",
    "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize",
    "zoom-in", "zoom-out"
]);

/**
 * Browser adaptation of CarbonEngine's mouse cursor using CSS cursor values.
 */
export class Tr2MouseCursor
{
    /**
     * The browser CSS cursor value, or null when no representation resolved.
     * Stands in for Carbon's platform m_cursor handle (Tr2MouseCursor.h:31).
     * @type {string|null}
     */
    cssCursor = null;

    /**
     * Hotspot x offset in pixels of the selected representation.
     * @type {number}
     */
    hotspotX = 0;

    /**
     * Hotspot y offset in pixels of the selected representation.
     * @type {number}
     */
    hotspotY = 0;

    /**
     * Width in pixels of the selected representation, or 0 when unknown.
     * @type {number}
     */
    width = 0;

    /**
     * Height in pixels of the selected representation, or 0 when unknown.
     * @type {number}
     */
    height = 0;

    /**
     * Object URL this cursor created and must revoke, or null.
     * @type {string|null}
     */
    #objectUrl = null;

    /** Creates an optional browser CSS cursor from one or more representations. */
    constructor(bitmap = null, hotspotX = 0, hotspotY = 0, representations = [])
    {
        if (bitmap !== null) this.Create(bitmap, hotspotX, hotspotY, representations);
    }

    /** Initializes this cursor using Carbon's constructor-style method name. */
    __init__(bitmap, hotspotX = 0, hotspotY = 0, representations = [])
    {
        this.Create(bitmap, hotspotX, hotspotY, representations);
    }

    /**
     * Selects a usable representation and creates its CSS cursor value.
     *
     * The bitmap, then each alternate representation, is tried in order: a CSS
     * keyword, a URL or `url(...)` string, a canvas-like object
     * (`toDataURL`), an object with `url`, `src` or `dataURL`, or a
     * blob-like source turned into an object URL that the next Create or
     * Destruct() revokes. Returns false when none resolves.
     *
     * The previous cursor is released first, inline, as Carbon's Create
     * releases m_cursor before building the new one (Tr2MouseCursor.cpp:274-279).
     */
    Create(bitmap, hotspotX = 0, hotspotY = 0, representations = [])
    {
        if (this.#objectUrl && typeof globalThis.URL?.revokeObjectURL === "function")
        {
            globalThis.URL.revokeObjectURL(this.#objectUrl);
        }
        this.#objectUrl = null;
        this.cssCursor = null;

        const candidates = [ bitmap, ...(representations ?? []) ];
        let source = null;
        let selected = null;
        for (const candidate of candidates)
        {
            source = this.#resolveSource(candidate);
            if (source)
            {
                selected = candidate;
                break;
            }
        }
        if (!source) return false;

        this.hotspotX = Math.max(0, Math.trunc(Number(hotspotX) || 0));
        this.hotspotY = Math.max(0, Math.trunc(Number(hotspotY) || 0));
        this.width = Number(selected?.width) || 0;
        this.height = Number(selected?.height) || 0;
        this.cssCursor = CSS_CURSOR_KEYWORDS.has(source)
            ? source
            : `url("${source.replace(/["\\\n\r]/gu, character => `\\${character}`)}") ${this.hotspotX} ${this.hotspotY}, auto`;
        return true;
    }

    /** Reports whether this cursor has a usable CSS value. */
    IsValid()
    {
        return typeof this.cssCursor === "string" && this.cssCursor.length > 0;
    }

    /** Applies this cursor to a style-bearing browser target. */
    Apply(target = globalThis.document?.documentElement)
    {
        if (!this.IsValid() || !target?.style) return false;
        target.style.cursor = this.cssCursor;
        return true;
    }

    /**
     * Releases any owned object URL and clears the cursor value.
     *
     * Temporary destructor stand-in: exists because teardown is required before
     * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
     * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
     */
    Destruct()
    {
        if (this.#objectUrl && typeof globalThis.URL?.revokeObjectURL === "function")
        {
            globalThis.URL.revokeObjectURL(this.#objectUrl);
        }
        this.#objectUrl = null;
        this.cssCursor = null;
    }

    /** Resolves one cursor representation to a CSS-compatible source. */
    #resolveSource(bitmap)
    {
        if (typeof bitmap === "string")
        {
            const value = bitmap.trim();
            if (!value) return null;
            if (CSS_CURSOR_KEYWORDS.has(value)) return value;
            const match = /^url\(["']?(.*?)["']?\)(?:\s|,|$)/u.exec(value);
            return match ? match[1] : value;
        }
        if (!bitmap || typeof bitmap !== "object") return null;
        if (typeof bitmap.toDataURL === "function") return bitmap.toDataURL();
        for (const key of [ "url", "src", "dataURL" ])
        {
            if (typeof bitmap[key] === "string" && bitmap[key]) return bitmap[key];
        }
        if (typeof globalThis.URL?.createObjectURL === "function")
        {
            try
            {
                this.#objectUrl = globalThis.URL.createObjectURL(bitmap.blob ?? bitmap);
                return this.#objectUrl;
            }
            catch
            {
                return null;
            }
        }
        return null;
    }
}

export default Tr2MouseCursor;

blue.inherit(IRoot)(Tr2MouseCursor);

CjsSchema.decorateMethod(Tr2MouseCursor, "__init__", meta.renamed("py__init__"), meta.adapted);
CjsSchema.decorateMethod(Tr2MouseCursor, "Create", blue.method, meta.adapted);
CjsSchema.decorateMethod(Tr2MouseCursor, "IsValid", blue.method, meta.adapted);
CjsSchema.decorateMethod(Tr2MouseCursor, "Apply", blue.method, meta.adapted);
CjsSchema.exposure.define("Tr2MouseCursor")(Tr2MouseCursor);
