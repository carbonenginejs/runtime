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
     * A dependant modifier's weight: a typed relation's weight wins, then the weight its metadata states, and a
     * modifier that states none is at 1. This is the one resolution of an unstated dependant weight
     * (`CjsCharacterModifier.weight` is null for one); the character format only reads what the file says.
     * @param {{ weight: ?number }} modifier The modifier, as the character format reads it.
     * @param {?number} [relationWeight=null] A typed relation's weight.
     * @returns {number}
     */
    static dependantWeight(modifier, relationWeight = null)
    {
        if (relationWeight !== null && relationWeight !== undefined) return relationWeight;
        return modifier.weight === null || modifier.weight === undefined ? 1 : modifier.weight;
    }

    /**
     * One `dependantModifiers` entry as a utility-shape request: its weight (`dependantWeight`: zero and >1 allowed,
     * never clamped). A path outside `utilityshapes/` is unresolved. The character format has read the entry
     * (`CjsCharacterYamlFormat.decodeModifier`: `utilityshapes/<target>###<number>`, or no weight).
     * @param {{ path: string, weight: ?number }} modifier The entry, as the character format reads it.
     * @param {number|null} [relationWeight=null] A typed relation's weight; it wins over the stated one.
     * @param {string} [relationPath=""] A typed relation's modifier path; when not empty it wins over the entry's path.
     * @returns {{modifierPath: string, targetName: string, weight: number, explicitWeight: boolean}|null}
     *   The lower-case normalized path, the morph target (the path's last segment, as authored), and its weight; null when unresolved.
     */
    static decodeUtilityShape(modifier, relationWeight = null, relationPath = "")
    {
        const base = modifier.path;
        const modifierPath = NormalizeUtilityPath(relationPath || base);
        if (!modifierPath) return null;
        const weight = CjsCharacterAppearanceResolver.dependantWeight(modifier, relationWeight);
        if (!Number.isFinite(weight)) return null;
        return {
            modifierPath,
            targetName: base.slice(base.lastIndexOf("/") + 1),
            weight,
            explicitWeight: modifier.weight !== null && modifier.weight !== undefined
        };
    }

    /**
     * One `occludesModifiers` entry as a utility-shape occlusion. A weighted entry
     * (`utilityshapes/pinchrighthipsshape#2.0`) sets the named morph to that weight while its item is worn (operator,
     * 2026-11-12); one that states no weight suppresses it (weight null). The character format has read the entry
     * (`CjsCharacterYamlFormat.decodeModifier`).
     * @param {{ path: string, weight: ?number }} modifier The entry, as the character format reads it.
     * @param {string} [relationPath=""] A typed relation's modifier path; when not empty it wins over the entry's path.
     * @returns {{modifierPath: string, targetName: string, weight: ?number}|null} The lower-case normalized path, the
     *   morph's name as authored and the weight it sets (null for none); null when not a utility shape.
     */
    static decodeUtilityOcclusion(modifier, relationPath = "")
    {
        const base = modifier.path;
        const weight = modifier.weight === undefined ? null : modifier.weight;
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
     * @param {?(owner: any) => ?number} [layer=null] Each owner's layer rank (`CjsPaperDollDefinition.GetLayer`). When
     *   worn items set one morph to different weights, the one in the highest layer wins: the top's drape sets
     *   `pushdrapeshape#0.25` and `outer/jacketcm01` `#0.0`, and the jacket over it applies (operator, 2026-11-13: the
     *   conflict crashed characters). Ours, provisional: no metadata orders two weighted settings of one morph.
     * @returns {{modifierPath: string, suppressed: object[], retained: object[], conflict: boolean}[]} One record per path.
     * @throws {Error} For worn items setting one morph to different weights when no single highest layer holds one.
     */
    static resolveUtilityShapes(requests, occlusions, layer = null)
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
            let settings = matchingOcclusions.filter(value => value.weight !== null && value.weight !== undefined);
            if (settings.length)
            {
                if (layer !== null && new Set(settings.map(value => value.weight)).size > 1)
                {
                    const ranks = settings.map(value => layer(value.owner));
                    if (ranks.every(rank => typeof rank === "number"))
                    {
                        const top = Math.max(...ranks);
                        settings = settings.filter((value, index) => ranks[index] === top);
                    }
                }
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
