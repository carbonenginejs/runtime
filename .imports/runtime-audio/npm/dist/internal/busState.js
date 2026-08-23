function NormalizeIdentity(value) {
  return String(value).trim().toLowerCase();
}

/** Indexes an installed bus-state catalog by authored bus id and state alias. */
function indexBusStateCatalog(catalog) {
  const result = new Map();
  for (const [busId, groups] of Object.entries(catalog?.buses ?? {})) {
    result.set(String(busId), groups.map(group => {
      const states = new Map();
      for (const state of group.states ?? []) {
        for (const alias of [state.stateId, state.state]) {
          states.set(NormalizeIdentity(alias), state);
        }
      }
      return {
        group: group.group,
        groupId: group.groupId,
        syncType: Number(group.syncType),
        effectiveSyncType: Number(group.effectiveSyncType),
        states
      };
    }));
  }
  return result;
}

/** Returns whether one dry bus ancestry authors a given Bus State property. */
function busStatePathUses(catalog, busPathIds, property) {
  if (!(catalog instanceof Map)) return false;
  for (const rawBusId of busPathIds ?? []) {
    for (const group of catalog.get(String(rawBusId)) ?? []) {
      for (const state of group.states.values()) {
        if (Number.isFinite(Number(state?.[property]))) return true;
      }
    }
  }
  return false;
}

/** Evaluates additive Immediate Bus State properties across a dry ancestry. */
function evaluateBusStateProperties(catalog, busPathIds, readGlobalStateWeights, at = undefined) {
  const result = {
    gainDb: 0,
    pitchCents: 0,
    lowPass: 0,
    highPass: 0
  };
  if (!(catalog instanceof Map) || typeof readGlobalStateWeights !== "function") {
    return result;
  }
  const seen = new Set();
  for (const rawBusId of busPathIds ?? []) {
    const busId = String(rawBusId);
    if (seen.has(busId)) continue;
    seen.add(busId);
    for (const group of catalog.get(busId) ?? []) {
      if (group.effectiveSyncType !== 0) continue;
      const weights = readGlobalStateWeights(group.group, at);
      for (const entry of Array.isArray(weights) ? weights : []) {
        const weight = Number(entry?.weight);
        const state = group.states.get(NormalizeIdentity(entry?.state));
        if (!state || !Number.isFinite(weight) || weight <= 0) {
          continue;
        }
        for (const property of Object.keys(result)) {
          result[property] += (Number(state[property]) || 0) * weight;
        }
      }
    }
  }
  return result;
}

/** Evaluates additive Immediate Bus Volume state across one dry bus ancestry. */
function evaluateBusStateGainDb(catalog, busPathIds, readGlobalStateWeights, at = undefined) {
  return evaluateBusStateProperties(catalog, busPathIds, readGlobalStateWeights, at).gainDb;
}

export { busStatePathUses, evaluateBusStateGainDb, evaluateBusStateProperties, indexBusStateCatalog };
//# sourceMappingURL=busState.js.map
