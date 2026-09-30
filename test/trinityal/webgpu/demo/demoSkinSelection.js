/** Whether two DNAs describe the same full hull selection and race. */
function sameHull(left, right)
{
  const a = left.toLowerCase().split(":"), b = right.toLowerCase().split(":");
  return a[0] === b[0] && a[2] === b[2];
}

/** Combines the authoritative default appearance with unchanged structural clauses. */
function defaultAppearance(current, base)
{
  if (!sameHull(current, base)) throw new Error("Default ship does not match the current hull and race; choose a type explicitly.");
  const result = base.split(":"), original = current.split(":").slice(3);
  const appearance = new Set(["mesh", "material", "pattern", "respathinsert"]);
  for (const clause of original)
  {
    const command = clause.split("?")[0].toLowerCase();
    if (appearance.has(command)) continue;
    const existing = result.slice(3).find(value => value.split("?")[0].toLowerCase() === command);
    if (existing && existing !== clause) throw new Error(`Default DNA conflicts with ${command}; load the desired DNA explicitly.`);
    if (!existing) result.push(clause);
  }
  return result.join(":");
}

/**
 * Resolves the current ship's default through the existing SDE search/resolve routes.
 * A complete result must identify one default; ranking never decides the hull.
 *
 * @param {string} dna Current skin DNA.
 * @param {number|string|null} typeID Explicitly selected type, when known.
 * @param {{search: Function, resolve: Function}} source Pinned SDE operations.
 * @returns {Promise<string>} Same-hull default appearance.
 */
export async function resolveDemoDefaultDna(dna, typeID, source)
{
  if (typeID != null) return defaultAppearance(dna, (await source.resolve(typeID)).dna);
  const exact = await source.search(dna);
  if (exact.truncated) throw new Error("DNA lookup is incomplete; select the ship type explicitly.");
  let candidates = exact.matches.filter(entry => entry.exact && sameHull(dna, entry.dna));
  if (!candidates.length)
  {
    const byHull = await source.search(dna.split(":")[0]);
    if (byHull.truncated) throw new Error("Hull lookup is incomplete; select the ship type explicitly.");
    candidates = byHull.matches.filter(entry => entry.skinID == null && sameHull(dna, entry.dna));
  }
  // Different types can share skin DNA but have different unskinned defaults.
  // Resolve every distinct type before deciding that the answer is unique.
  const representatives = new Set(candidates.map(entry => entry.typeID));
  const defaults = new Set();
  for (const id of representatives) defaults.add(defaultAppearance(dna, (await source.resolve(id)).dna));
  if (defaults.size !== 1) throw new Error("No unique default for this hull; select the ship type explicitly.");
  return defaults.values().next().value;
}

/**
 * Keeps the demo's no-argument toggle on the current hull and commits selection
 * state only after replacement succeeds. Explicit DNA remains the hull-change path.
 *
 * @param {{initialDna: string, resolveDefault: Function, replace: Function, serialize: Function}} options Caller operations.
 * @returns {Function} Serialized skin/default toggle or explicit DNA load.
 */
export function createDemoSkinChange({ initialDna, resolveDefault, replace, serialize })
{
  let current = initialDna, on = initialDna, off = null, typeID = null;
  return (dna = null, selectedTypeID = null) => serialize(async () =>
  {
    const explicit = dna !== null;
    const nextOff = explicit ? null : off ?? await resolveDefault(on, typeID);
    const target = explicit ? dna : current === nextOff ? on : nextOff;
    if (explicit || target !== current) await replace(target);
    current = target;
    if (explicit)
    {
      on = dna;
      off = null;
      typeID = selectedTypeID;
    }
    else off = nextOff;
    return current;
  });
}
