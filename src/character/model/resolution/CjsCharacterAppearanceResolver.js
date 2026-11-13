/**
 * The paper doll's suppression walk and utility-shape rules: which worn parts another removes ("occludes"), and how
 * metadata's utility shapes and occlusions combine (`resolveSuppressions`, `decodeUtilityShape`,
 * `decodeUtilityOcclusion`, `resolveUtilityShapes`). The schema-12 catalog resolution that shared this class went with
 * the prepared documents (2026-11-11).
 */
export class CjsCharacterAppearanceResolver
{

    /**
     * Walks the selections' suppression graph: an edge says `owner` suppresses
     * `target`. A selection on a cycle stays active. Otherwise suppression runs
     * from the roots (active selections no active selection suppresses, outside
     * a shared cycle), so a suppressed selection's own edges stop applying: if A
     * suppresses B and B suppresses C, C stays active.
     * @param {any[]} nodes The selections, in order.
     * @param {Map<any, {owner: any, rules: Set<string>}[]>} suppressions Edges by target: who suppresses it, and through which rules.
     * @returns {{cyclic: any[], applied: Map<any, {owner: any, rules: Set<string>}[]>}}
     *   The selections left active by a cycle, in node order, and each suppressed selection with the edges that applied, in application order.
     */
    static resolveSuppressions(nodes, suppressions)
    {
        const cyclic = nodes.filter(value =>
            HasSuppressionPath(suppressions, value, value));

        const active = new Set(nodes);
        const applied = new Map();
        while (true)
        {
            const roots = [ ...active ].filter(target =>
                !(suppressions.get(target) ?? []).some(value =>
                    active.has(value.owner)
                    && !ShareSuppressionCycle(suppressions, value.owner, target)));
            const next = new Map();
            for (const owner of roots)
            {
                for (const [ target, owners ] of suppressions)
                {
                    if (!active.has(target)
                        || ShareSuppressionCycle(suppressions, owner, target)) continue;
                    const value = owners.find(candidate => candidate.owner === owner);
                    if (!value) continue;
                    if (!next.has(target)) next.set(target, []);
                    next.get(target).push(value);
                }
            }
            if (!next.size) break;
            for (const [ target, owners ] of next)
            {
                active.delete(target);
                applied.set(target, owners);
            }
        }
        return { cyclic, applied };
    }

    /**
     * Decodes one authored `dependantModifiers` entry as a utility-shape
     * request: `utilityshapes/<target>` at weight 1, or
     * `utilityshapes/<target>###<number>` at that weight (zero and >1
     * allowed, never clamped); a trailing `#` with no weight is the
     * unweighted request. Any other `#` form, a non-numeric suffix and a
     * path outside `utilityshapes/` are unresolved.
     * @param {string} authoredValue The entry as authored.
     * @param {number|null} [relationWeight=null] A typed relation's weight; it wins over the suffix.
     * @param {string} [relationPath=""] A typed relation's modifier path; when not empty it wins over the authored path.
     * @returns {{modifierPath: string, targetName: string, weight: number, explicitWeight: boolean}|null}
     *   The lower-case normalized path, the morph target (the path's last segment, as authored), and its weight; null when unresolved.
     */
    static decodeUtilityShape(authoredValue, relationWeight = null, relationPath = "")
    {
        const authored = String(authoredValue);
        const weighted = authored.match(/^(utilityshapes\/.+?)###([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/iu);
        let base = authored;
        let weight = relationWeight;
        let explicitWeight = false;

        if (weighted)
        {
            base = weighted[1];
            const parsed = Number(weighted[2]);
            if (!Number.isFinite(parsed)) return null;
            weight = weight === null || weight === undefined ? parsed : weight;
            explicitWeight = true;
        }
        else if (/^utilityshapes\/[^#]+#+$/iu.test(authored))
        {
            // A trailing `#` with no weight states none, so the entry is the unweighted request. The one such entry in the
            // corpus is `outer/jacketmilf01`'s `utilityshapes/pinchrightouterlowerhipsshape#`.
            base = authored.replace(/#+$/u, "");
        }
        else if (authored.includes("#"))
        {
            return null;
        }

        const modifierPath = NormalizeUtilityPath(relationPath || base);
        if (!modifierPath) return null;
        if (weight === null || weight === undefined) weight = 1;
        if (!Number.isFinite(weight)) return null;

        return {
            modifierPath,
            targetName: base.slice(base.lastIndexOf("/") + 1),
            weight,
            explicitWeight
        };
    }

    /**
     * Decodes one authored `occludesModifiers` entry as a utility-shape
     * occlusion. A weighted entry (`utilityshapes/pinchrighthipsshape#2.0`) sets
     * the named morph to that weight while its item is worn (operator,
     * 2026-11-12); an unweighted one suppresses it. Any other `#` form is
     * unresolved.
     * @param {string} authoredValue The entry as authored.
     * @param {string} [relationPath=""] A typed relation's modifier path; when not empty it wins over the authored path.
     * @returns {{modifierPath: string, targetName: string, weight: ?number}|null} The lower-case normalized path, the
     *   morph's name as authored and the weight it sets (null for none); null when unresolved or not a utility shape.
     */
    static decodeUtilityOcclusion(authoredValue, relationPath = "")
    {
        const authored = String(authoredValue);
        const weighted = authored.match(/^([^#]+)#([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/u);
        if (!weighted && authored.includes("#")) return null;
        const base = weighted ? weighted[1] : authored;
        const weight = weighted ? Number(weighted[2]) : null;
        if (weight !== null && !Number.isFinite(weight)) return null;
        const modifierPath = NormalizeUtilityPath(relationPath || base);
        return modifierPath ? { modifierPath, targetName: base.slice(base.lastIndexOf("/") + 1), weight } : null;
    }

    /**
     * Applies the utility-shape rule to the active selections' requests and
     * occlusions, grouped by path in first-request order, then the paths only
     * a weighted occlusion names. A weighted occlusion sets its morph to its
     * weight while its item is worn, exactly as authored (operator,
     * 2026-11-12): the path retains that setting, as `{ modifierPath,
     * targetName, weight, owner }`, and every request of it is suppressed.
     * Otherwise a request is suppressed by any unweighted occlusion of its
     * path, unless that occlusion's `protectedOwner` is the request's owner,
     * and requests left with differing weights are a conflict and request
     * nothing; otherwise all are retained.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {{modifierPath: string, weight: number, owner: any}[]} requests Decoded requests (decodeUtilityShape), each with its owner.
     * @param {{modifierPath: string, targetName: string, weight: ?number, protectedOwner: any, owner?: any}[]} occlusions
     *   Decoded occlusions (decodeUtilityOcclusion); `protectedOwner` is null when none, `owner` the item that sets a weight.
     * @returns {{modifierPath: string, suppressed: object[], retained: object[], conflict: boolean}[]} One record per path.
     * @throws {Error} For two worn items setting one morph to different weights: no rule chooses between them.
     */
    static resolveUtilityShapes(requests, occlusions)
    {
        const grouped = new Map();

        for (const request of requests)
        {
            if (!grouped.has(request.modifierPath)) grouped.set(request.modifierPath, []);
            grouped.get(request.modifierPath).push(request);
        }
        for (const occlusion of occlusions)
        {
            if (occlusion.weight !== null && occlusion.weight !== undefined && !grouped.has(occlusion.modifierPath)) grouped.set(occlusion.modifierPath, []);
        }

        const result = [];
        for (const [ modifierPath, values ] of grouped)
        {
            const matchingOcclusions = occlusions.filter(value =>
                value.modifierPath === modifierPath);
            const settings = matchingOcclusions.filter(value => value.weight !== null && value.weight !== undefined);
            if (settings.length)
            {
                if (new Set(settings.map(value => value.weight)).size > 1)
                    throw new Error("No paper doll rule for " + modifierPath + " set to " + settings.map(value => value.weight).join(" and ") + " at once");
                const { targetName, weight, owner = null } = settings[0];
                result.push({ modifierPath, suppressed: [ ...values ], retained: [ { modifierPath, targetName, weight, owner } ], conflict: false });
                continue;
            }
            const suppressed = [];
            const retained = [];

            for (const value of values)
            {
                if (matchingOcclusions.some(occlusion =>
                    occlusion.protectedOwner === null
                    || occlusion.protectedOwner !== value.owner)) suppressed.push(value);
                else retained.push(value);
            }

            result.push({ modifierPath, suppressed, retained, conflict: new Set(retained.map(value => value.weight)).size > 1 });
        }
        return result;
    }

}

function HasSuppressionPath(suppressions, owner, target, visited = new Set())
{
    if (visited.has(owner)) return false;
    visited.add(owner);
    for (const [ candidate, owners ] of suppressions)
    {
        if (!owners.some(value => value.owner === owner)) continue;
        if (candidate === target
            || HasSuppressionPath(suppressions, candidate, target, visited))
        {
            return true;
        }
    }
    return false;
}

function ShareSuppressionCycle(suppressions, left, right)
{
    return HasSuppressionPath(suppressions, left, right)
        && HasSuppressionPath(suppressions, right, left);
}

function NormalizeUtilityPath(value)
{
    const result = String(value ?? "")
        .replaceAll("\\", "/")
        .replace(/^\/+|\/+$/gu, "")
        .toLowerCase();

    if (!result.startsWith("utilityshapes/")
        || result.split("/").some(segment => !segment || segment === "." || segment === ".."))
    {
        return null;
    }

    return result;
}
