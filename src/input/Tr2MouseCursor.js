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
    /** Creates an optional browser CSS cursor from one or more representations. */
    constructor(bitmap = null, hotspotX = 0, hotspotY = 0, representations = [])
    {
        this.cssCursor = null;
        this.hotspotX = 0;
        this.hotspotY = 0;
        this.width = 0;
        this.height = 0;
        this.#objectUrl = null;
        if (bitmap !== null) this.Create(bitmap, hotspotX, hotspotY, representations);
    }

    #objectUrl;

    /** Initializes this cursor using Carbon's constructor-style method name. */
    __init__(bitmap, hotspotX = 0, hotspotY = 0, representations = [])
    {
        this.Create(bitmap, hotspotX, hotspotY, representations);
    }

    /** Selects a usable representation and creates its CSS cursor value. */
    Create(bitmap, hotspotX = 0, hotspotY = 0, representations = [])
    {
        this.Destroy();
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

    /** Releases any owned object URL and clears the cursor value. */
    Destroy()
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
