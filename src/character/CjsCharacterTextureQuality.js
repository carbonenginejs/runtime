/**
 * Chooses retained character texture variants without coupling selection to a
 * resource manager or renderer.
 *
 * The filename tiers are an input convention of the current character asset
 * inventory. Callers retain the original resource path; this class only picks
 * an available member of one already-known family.
 */
export class CjsCharacterTextureQuality
{
    static levels = Object.freeze([
        "4k",
        "standard",
        "512",
        "256"
    ]);

    static #extensionOrder = Object.freeze({
        "4k": Object.freeze([ "png", "dds" ]),
        standard: Object.freeze([ "dds", "png" ]),
        "512": Object.freeze([ "png", "dds" ]),
        "256": Object.freeze([ "dds", "png" ])
    });

    /** Normalizes one caller-supplied quality tier. */
    static normalize(value)
    {
        const normalized = String(value ?? "4k").trim().toLowerCase();
        if (normalized === "std") return "standard";
        return this.levels.includes(normalized) ? normalized : "4k";
    }

    /** Returns the tier encoded by one retained character texture filename. */
    static getQuality(path)
    {
        const match = String(path ?? "").match(
            /_(4k|512|256)(?=(?:_hi)?\.(?:png|dds|tga|jpe?g)$)/iu
        );
        return match?.[1]?.toLowerCase() ?? "standard";
    }

    /** Returns the quality-neutral identity of one retained texture path. */
    static getFamily(path)
    {
        return String(path ?? "")
            .trim()
            .replaceAll("\\", "/")
            .toLowerCase()
            .replace(/_(?:4k|512|256)(?:_hi)?(?=\.(?:png|dds|tga|jpe?g)$)/u, "")
            .replace(/_hi(?=\.(?:png|dds|tga|jpe?g)$)/u, "")
            .replace(/\.(?:png|dds|tga|jpe?g)$/u, "");
    }

    /** True when a candidate is at the requested tier or one of its fallbacks. */
    static isAllowed(path, requestedQuality = "4k")
    {
        const requested = this.normalize(requestedQuality);
        return this.levels.indexOf(this.getQuality(path))
            >= this.levels.indexOf(requested);
    }

    /**
     * Selects a retained candidate at the requested quality, falling only to
     * lower tiers. PNG/DDS preference matches the reviewed demo remapper.
     */
    static select(paths, requestedQuality = "4k")
    {
        if (!Array.isArray(paths))
        {
            throw new TypeError("Character texture quality candidates must be an array");
        }

        const requested = this.normalize(requestedQuality);
        const start = this.levels.indexOf(requested);
        for (const quality of this.levels.slice(start))
        {
            const atQuality = paths.filter(path => this.getQuality(path) === quality);
            for (const extension of this.#extensionOrder[quality])
            {
                const selected = atQuality.find(path => String(path).toLowerCase()
                    .endsWith(`.${extension}`));
                if (selected) return selected;
            }
            if (atQuality.length) return atQuality[0];
        }

        return null;
    }

    /**
     * Selects a topology-critical coverage candidate. If the requested tier
     * has no member, the nearest higher retained tier remains usable so a
     * quality preference cannot erase known coverage.
     */
    static selectCoverage(paths, requestedQuality = "4k")
    {
        if (!Array.isArray(paths))
        {
            throw new TypeError("Character coverage texture candidates must be an array");
        }

        const selected = this.select(paths, requestedQuality);
        if (selected) return selected;

        const requested = this.normalize(requestedQuality);
        const start = this.levels.indexOf(requested);
        for (const quality of this.levels.slice(0, start).reverse())
        {
            const atQuality = paths.filter(path => this.getQuality(path) === quality);
            for (const extension of this.#extensionOrder[quality])
            {
                const higher = atQuality.find(path => String(path).toLowerCase()
                    .endsWith(`.${extension}`));
                if (higher) return higher;
            }
            if (atQuality.length) return atQuality[0];
        }

        return null;
    }
}

export default CjsCharacterTextureQuality;
