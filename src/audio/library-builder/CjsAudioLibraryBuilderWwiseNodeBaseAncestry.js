import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).


/** Traces and caches mechanical Wwise NodeBase parent ancestry. */
export class CjsAudioLibraryBuilderWwiseNodeBaseAncestry
{
    _cache = new Map();

    _getNodeBase = null;

    /** Creates a tracer over one immutable parsed NodeBase catalog. */
    constructor(getNodeBase)
    {
        this._getNodeBase = getNodeBase;
    }

    /** Returns one leaf-to-root trace with an explicit terminal condition. */
    Trace(rawID)
    {
        const startId = Number(rawID) >>> 0;
        const cached = this._cache.get(startId);

        if (cached)
        {
            return cached;
        }

        const entries = [];
        const visited = new Set();
        let current = startId;
        let terminal = "root";
        let terminalId = 0;

        while (current)
        {
            if (visited.has(current))
            {
                terminal = "cycle";
                terminalId = current;
                break;
            }
            visited.add(current);

            const nodeBase = this._getNodeBase(current);

            if (!nodeBase)
            {
                terminal = "missing";
                terminalId = current;
                break;
            }

            const parentId = Number(nodeBase.directParentId) >>> 0;

            entries.push({ id: current, nodeBase, parentId });
            current = parentId;
        }

        const result = { startId, entries, terminal, terminalId };

        this._cache.set(startId, result);
        return result;
    }
}

CjsSchema.meta.define("CjsAudioLibraryBuilderWwiseNodeBaseAncestry")(CjsAudioLibraryBuilderWwiseNodeBaseAncestry);
