const DEFAULT_SIZE = [ 2048, 1024 ];

const NORMALIZED_RECTS = {
    body: [ 0, 0, 0.5, 1 ],
    head: [ 0.5, 0, 1, 0.5 ],
    hair: [ 0.5, 0.5, 0.75, 1 ],
    accessories: [ 0.75, 0.5, 1, 1 ]
};

/** Provides the verified logical regions of the shared character atlas. */
export class CjsCharacterAtlasLayout
{

    /** Returns a caller-owned copy of the native default atlas size. */
    static getDefaultSize()
    {
        return [ ...DEFAULT_SIZE ];
    }

    /** Returns the logical atlas regions in their composition-group order. */
    static getRegions()
    {
        return Object.keys(NORMALIZED_RECTS);
    }

    /** Returns a caller-owned normalized rectangle or null for an unknown region. */
    static getNormalizedRect(region)
    {
        const rect = NORMALIZED_RECTS[String(region ?? "").toLowerCase()];
        return rect ? [ ...rect ] : null;
    }

}

export default CjsCharacterAtlasLayout;
