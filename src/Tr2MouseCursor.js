// Browser adaptation of CarbonEngine trinity/trinity/UI/Tr2MouseCursor.

const CSS_CURSOR_KEYWORDS = new Set([
    "auto", "default", "none", "context-menu", "help", "pointer", "progress", "wait",
    "cell", "crosshair", "text", "vertical-text", "alias", "copy", "move", "no-drop",
    "not-allowed", "grab", "grabbing", "all-scroll", "col-resize", "row-resize",
    "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize",
    "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize",
    "zoom-in", "zoom-out"
]);

export class Tr2MouseCursor
{
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

    __init__(bitmap, hotspotX = 0, hotspotY = 0, representations = [])
    {
        this.Create(bitmap, hotspotX, hotspotY, representations);
    }

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

    IsValid()
    {
        return typeof this.cssCursor === "string" && this.cssCursor.length > 0;
    }

    Apply(target = globalThis.document?.documentElement)
    {
        if (!this.IsValid() || !target?.style) return false;
        target.style.cursor = this.cssCursor;
        return true;
    }

    Destroy()
    {
        if (this.#objectUrl && typeof globalThis.URL?.revokeObjectURL === "function")
        {
            globalThis.URL.revokeObjectURL(this.#objectUrl);
        }
        this.#objectUrl = null;
        this.cssCursor = null;
    }

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
