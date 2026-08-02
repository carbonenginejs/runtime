function NormalizeIdentity(value)
{
    return String(value).trim().toLowerCase();
}

/** Indexes an installed bus-state catalog by authored bus id and state alias. */
export function indexBusStateCatalog(catalog)
{
    const result = new Map();

    for (const [ busId, groups ] of Object.entries(catalog?.buses ?? {}))
    {
        result.set(String(busId), groups.map(group =>
        {
            const states = new Map();

            for (const state of group.states ?? [])
            {
                for (const alias of [ state.stateId, state.state ])
                {
                    states.set(NormalizeIdentity(alias), state);
                }
            }
            return {
                group: group.group,
                groupId: group.groupId,
                syncType: Number(group.syncType),
                effectiveSyncType: Number(group.effectiveSyncType),
                states,
            };
        }));
    }
    return result;
}

/** Evaluates additive Immediate Bus Volume state across one dry bus ancestry. */
export function evaluateBusStateGainDb(
    catalog,
    busPathIds,
    readGlobalStateWeights,
    at = undefined,
)
{
    if (!(catalog instanceof Map)
        || typeof readGlobalStateWeights !== "function")
    {
        return 0;
    }

    let gainDb = 0;
    const seen = new Set();

    for (const rawBusId of busPathIds ?? [])
    {
        const busId = String(rawBusId);

        if (seen.has(busId)) continue;
        seen.add(busId);

        for (const group of catalog.get(busId) ?? [])
        {
            if (group.effectiveSyncType !== 0) continue;

            const weights = readGlobalStateWeights(group.group, at);

            for (const entry of Array.isArray(weights) ? weights : [])
            {
                const weight = Number(entry?.weight);
                const state = group.states.get(NormalizeIdentity(entry?.state));

                if (state && Number.isFinite(weight) && weight > 0)
                {
                    gainDb += (Number(state.gainDb) || 0) * weight;
                }
            }
        }
    }
    return gainDb;
}
