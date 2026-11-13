import { CjsSchema, meta } from "#schema";
import { CjsCharacterAppearanceResolver } from "../model/resolution/CjsCharacterAppearanceResolver.js";
import { CjsPaperDollDefinition } from "./CjsPaperDollDefinition.js";
import { PaperDollTarget } from "./paperDollOrder.js";

/**
 * One built paper doll character: what was made from a definition. It owns
 * its target bindings (the prepared compositions, their targets and effects),
 * the skinned objects drawn for it, and the captured settings each target was
 * last built from. Nothing an instance builds is shared with another instance:
 * characters own their state until sharing is proven.
 *
 * `Update` decides what each target bakes and calls that target's binding only when it changed: it collects the
 * target's parts in bake order (`GetLayerOrder`), applies the bake rules (suppression, below) and hands the binding a
 * ready capture: each part's settings, `lists` (the ready lists the composition draws, `order` and for the head
 * `brow`), `suppressed` and `cyclic`. The compositor draws only those lists. The head's capture also carries
 * `headOccluded`: whether a worn item occludes the foundation's generic head (its `occludesModifiers` name `head` or a
 * folder above it), so the host hides the head as it hides a suppressed hair part. A target re-captures whenever the
 * suppression or the occlusion targets change, whichever target's part changed them. Bindings are synchronous and run
 * outside a render pass.
 *
 * An application class; no Carbon
 * donor.
 */
@meta.define("CjsPaperDollInstance")
export class CjsPaperDollInstance
{

    _bindings = null;

    _appliedFoundation = null;

    _applied = new Map();

    _targetDirty = 0;

    _applying = false;

    /** The last update's suppression walk: the suppressed parts and the parts a cycle kept active. */
    _suppression = { suppressed: [], cyclic: [] };

    /** The skinned objects drawn for this character, added to a scene by its manager. */
    objects = [];

    /**
     * @param {{error: Function, foundation: Function, skin: Function, surface: Function, eyes: Function, head: Function, body: Function}} bindings
     *   Prepared synchronous bindings, one per target: each receives that target's capture (the foundation binding the
     *   resolved foundation); and `error`, required, which receives the message of a failure the instance meets outside a
     *   target (a held part whose option fails to resolve, `holdParts`).
     * @param {object[]} [objects=[]] The skinned objects drawn for this character.
     * @throws {TypeError} For bindings without an `error` function.
     */
    constructor(bindings, objects = [])
    {
        if (typeof bindings.error !== "function") throw new TypeError("CjsPaperDollInstance needs an error binding");
        this._bindings = bindings;
        this.objects = objects;
    }

    /**
     * Rebuilds the head target on the next `Update`, for a prepared layer whose
     * inputs finished loading after its option was selected.
     * @returns {void}
     */
    RebuildHead()
    {
        this.RebuildTargets(PaperDollTarget.HEAD);
    }

    /**
     * Rebuilds targets on the next `Update`, for an option whose inputs finished
     * loading after it was selected (options load on first selection).
     * @param {number} targets The targets to rebuild, as `PaperDollTarget` bits.
     * @returns {void}
     */
    RebuildTargets(targets)
    {
        this._targetDirty |= targets;
    }

    /**
     * Compares only fields which can affect a part's output: its scalars, and
     * the colours of the areas it uses.
     * @param {object} state A part's capture now.
     * @param {object|undefined} previous Its capture at the last build.
     * @returns {boolean} Whether the part's output would differ.
     */
    _Changed(state, previous)
    {
        if (!previous) return true;
        for (const key in state) if (key !== "colors" && key !== "colorAreas" && state[key] !== previous[key]) return true;
        return state.colorAreas.length !== previous.colorAreas.length
            || state.colorAreas.some((area, index) => area !== previous.colorAreas[index]
                || state.colors[area - 1].some((value, channel) => value !== previous.colors[area - 1][channel]));
    }

    /**
     * Collects the definition's edits once, then applies the foundation and
     * each target in `targetOrder`, calling a target's binding only when its captured
     * settings changed. Successful targets are acknowledged independently;
     * failed targets retry. Edits made during a binding remain dirty for the
     * following Update.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings to build from.
     * @returns {boolean} Whether any output was rebuilt.
     * @throws {Error} Whatever a binding throws; the failed targets are rebuilt on the next Update.
     */
    Update(definition)
    {
        if (this._applying) return false;
        const archetype = definition.archetype;
        const foundationPending = archetype.IsDirty();
        const foundation = foundationPending ? archetype.Resolve() : this._appliedFoundation;
        // A geometry-only strength edit must not rebuild skin or cosmetic maps.
        const forced = definition.IsForced();
        const dirtyTargets = definition.GetDirtyTargets() | this._targetDirty;
        for (const [ name, resolving ] of CjsPaperDollInstance.holdParts(definition))
            resolving.catch(error => this._bindings.error(name + " could not be held on: " + error.message));
        const suppression = this._suppression = CjsPaperDollInstance.suppress(definition);
        const plans = [];
        let changedTargets = 0;
        for (const { target, binding, whenSelected, reads } of CjsPaperDollInstance.targetOrder)
        {
            const names = definition.GetLayerOrder(target);
            const previous = this._applied.get(target) ?? null;
            // A shape-dependent part (a tattoo baked from the morphed face) rebuilds on any foundation edit.
            const reshaped = foundationPending && names.some(name => definition[name].constructor.shapeDependent && definition[name].enabled && definition[name].option !== "");
            const passForced = forced || reshaped || (dirtyTargets & target) !== 0 || (changedTargets & reads) !== 0;
            // Another target's part can change what this one hides (a robe resolving its occludes hides the hair and head).
            const occlusionChanged = previous !== null && (suppression.suppressed.join() !== previous.suppressed.join()
                || definition.GetOccluded().join() !== previous.occluded.join());
            const pending = passForced || !previous || occlusionChanged || names.some(name => definition[name].IsDirty());
            const state = pending ? CjsPaperDollInstance.ready(definition, target, names, suppression) : previous;
            // No archetype selected resolves no foundation, and so no generic head to occlude.
            if (pending && target === PaperDollTarget.HEAD) state.headOccluded = foundation !== null && CjsPaperDollDefinition.occludes(state.occluded, foundation.genericHead);
            const selected = !whenSelected || names.some(name => state[name].option || (previous !== null && previous[name].option));
            const changed = pending && selected && (passForced || !previous || state.lists.order.join() !== previous.lists.order.join() || state.occluded.join() !== previous.occluded.join() || state.suppressed.join() !== previous.suppressed.join() || names.some(name => this._Changed(state[name], previous[name])));
            if (changed) changedTargets |= target;
            plans.push({ target, binding, names, state, changed });
        }

        definition.ClearDirty();
        this._targetDirty = 0;
        this._applying = true;
        try
        {
            if (foundationPending) this._bindings.foundation(foundation);
            this._appliedFoundation = foundation;
            for (const plan of plans)
            {
                if (plan.changed) this._bindings[plan.binding](plan.state);
                this._applied.set(plan.target, plan.state);
            }
        }
        catch (error)
        {
            if (foundationPending && this._appliedFoundation !== foundation) archetype.Rebuild();
            // Do not discard a later target's pending edits if an earlier apply fails.
            for (const plan of plans) if (this._applied.get(plan.target) !== plan.state)
            {
                this._applied.delete(plan.target);
                for (const name of plan.names) definition[name].Rebuild();
            }
            throw error;
        }
        finally { this._applying = false; }
        return foundationPending || changedTargets !== 0;
    }

    /**
     * The last update's suppression walk, for the mesh side (fitting, carriers): the suppressed parts and the parts a
     * cycle kept active, by member name.
     * @returns {{ suppressed: string[], cyclic: string[] }}
     */
    GetSuppression()
    {
        return this._suppression;
    }

    /**
     * Holds the parts that are not overridable (`CjsPaperDollComponent.overridable`; operator, 2026-11-09): a part
     * switched off while no part that is still worn (on, resolved, and not itself suppressed: `suppress` over the parts as
     * they are) occludes it is switched back on, and its option resolved if it is not. Coverage is decided once, before the
     * held parts return, so holding and suppressing do not loop; an occluder still removes a held part from every bake
     * (`suppress`, run after). The host's switch only reflects this. `Update` reports a failed
     * resolution through the host's `error` binding.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The rule is the operator's.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @returns {Array<[ string, Promise<*> ]>} Each held part whose option is resolving, and the resolution.
     */
    static holdParts(definition)
    {
        // What is actually worn: the worn parts the suppression walk leaves.
        const { suppressed } = CjsPaperDollInstance.suppress(definition), resolving = [];
        const worn = CjsPaperDollInstance._Worn(definition).filter(item => !suppressed.includes(item.name));
        for (const name of CjsPaperDollDefinition.parts)
        {
            const part = definition[name];
            if (part.overridable || part.enabled || part.option === "") continue;
            const option = part.GetOptions().find(value => value.id === part.option);
            if (option === undefined) continue;
            const target = { name, category: part.constructor.category, path: option.path ?? part.constructor.category };
            if (worn.some(by => CjsPaperDollInstance._Occludes(by, target))) continue;
            CjsSchema.setValues(part, { enabled: true });
            if (!part.IsResolved(part.option)) resolving.push([ name, part.ResolveOption(part.option) ]);
        }
        return resolving;
    }

    /**
     * The worn parts (on, with an option, resolved): each one's name, category, path (its option's content path, else its
     * category) and what it occludes.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @returns {Array<{ name: string, category: string, path: string, occludes: string[] }>}
     */
    static _Worn(definition)
    {
        return CjsPaperDollDefinition.parts.filter(name =>
        {
            const part = definition[name];
            return part.enabled && part.option !== "" && part.IsResolved(part.option);
        }).map(name =>
        {
            const part = definition[name], option = part.GetOptions().find(value => value.id === part.option);
            return { name, category: part.constructor.category, path: option.path ?? part.constructor.category, occludes: option.occludes ?? [] };
        });
    }

    /**
     * Whether a worn part occludes another: one of its occludes names the other's category, or its path or a folder above.
     * @param {{ name: string, occludes: string[] }} by The occluding part.
     * @param {{ name: string, category: string, path: string }} target The other part.
     * @returns {boolean}
     */
    static _Occludes(by, target)
    {
        return by.name !== target.name && by.occludes.some(path => path === target.category || CjsPaperDollDefinition.occludes([ path ], target.path));
    }

    /**
     * Which parts are suppressed: runtime's suppression walk (`CjsCharacterAppearanceResolver.resolveSuppressions`)
     * over every active part whose option is resolved, an edge where one's `occludesModifiers` names another's category
     * or option path. Suppression runs from the roots; a cycle stays active. An unresolved option is not walked until its
     * resolution rebuilds the part, as the earlier walks took only resolved items. A suppressed part leaves every
     * target's bake (`ready`): occlusion drops, everywhere (operator, 2026-11-09).
     *
     * A part's path is its option's content path where the option states one (decals, garments, hair, beard,
     * accessories), else its category: the colourised parts, eyes, skin and tattoos, which the content's occluders name
     * only by category or a folder above it (`makeup`, `makeup/eyebrows`, `tattoo`). What a part occludes is its
     * option's `occludesModifiers`, none where the option states none: no colourised, eye, skin or tattoo metadata names
     * any (content, resource index of build 3670638).
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @returns {{ suppressed: string[], cyclic: string[] }} The suppressed parts and the parts a cycle kept active.
     */
    static suppress(definition)
    {
        const worn = CjsPaperDollInstance._Worn(definition);
        const edges = new Map();
        for (const target of worn) for (const by of worn)
        {
            if (by === target || !CjsPaperDollInstance._Occludes(by, target)) continue;
            if (!edges.has(target)) edges.set(target, []);
            edges.get(target).push({ owner: by, rules: new Set([ "occludesModifiers" ]) });
        }
        const { cyclic, applied } = CjsCharacterAppearanceResolver.resolveSuppressions(worn, edges);
        return { suppressed: [ ...applied.keys() ].map(item => item.name).sort(), cyclic: cyclic.map(item => item.name) };
    }

    /**
     * A worn item's own utility shapes: the `utilityshapes/` entries of its metadata's two lists, decoded
     * (`decodeUtilityShape`, `decodeUtilityOcclusion`). Every such entry decodes or throws (operator, 2026-11-12:
     * "all rules must be handled"); a weighted occlusion (`utilityshapes/pushhemshape#0.2`) sets its morph's weight
     * (`resolveUtilityShapes`). Entries outside `utilityshapes/` (dependants, occluded parts) are other rules' and
     * are not read here.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @param {{ metadataPath: string, dependantModifiers: string[], occludesModifiers: string[] }} item The
     *   `metadata.yaml` read for the item and its two lists as authored.
     * @returns {{ requests: object[], occlusions: object[] }} The item's requests (`{ modifierPath, targetName,
     *   weight, explicitWeight }`) and occlusions (`{ modifierPath, targetName, weight }`); the caller sets the owner.
     * @throws {Error} For a utility-shape entry no rule reads, naming the entry and the file.
     */
    static itemShapes(item)
    {
        const result = { requests: [], occlusions: [] };
        const isUtility = entry => /^utilityshapes\//iu.test(entry);
        for (const entry of item.dependantModifiers.filter(isUtility))
        {
            const request = CjsCharacterAppearanceResolver.decodeUtilityShape(entry);
            if (request === null) throw CjsPaperDollInstance._MissingRule("", "dependantModifiers", entry, item.metadataPath);
            result.requests.push(request);
        }
        for (const entry of item.occludesModifiers.filter(isUtility))
        {
            const occlusion = CjsCharacterAppearanceResolver.decodeUtilityOcclusion(entry);
            if (occlusion === null) throw CjsPaperDollInstance._MissingRule("", "occludesModifiers", entry, item.metadataPath);
            result.occlusions.push(occlusion);
        }
        return result;
    }

    /**
     * The utility shapes a worn garment's dependants add to its fitting (the tuck rule). Every dependant brings its
     * metadata's utility-shape requests, for the garment, and its occlusions, which protect no owner:
     * `dependants/boottucking/standard` suppresses its own garment's boot pinch as well as any other's, and
     * `standard/v1` the boots' trouser tucks; a weighted one sets its morph (`resolveUtilityShapes`), exactly as
     * authored, with no filtering by kind or target (operator, 2026-11-12: "we just do exactly what the garments
     * say"). `hidesBootShin` does not select them; both directions set it differently. The result goes to
     * `resolveUtilityShapes` with the worn items' own requests and occlusions. Every entry a dependant's metadata
     * states has a rule or throws (operator, 2026-11-12: "all rules must be handled"): a request that names no utility shape and a
     * utility shape that does not decode throw; an occlude outside `utilityshapes/` is the owner's (`dependantOccludes`).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @param {Array<{ path: string, metadataPath: string, dependantModifiers: string[], occludesModifiers: string[] }>}
     *   dependants The garment's dependants: each one's lower-case modifier path, the `metadata.yaml` read for it and
     *   that file's two lists as authored.
     * @returns {{ requests: object[], occlusions: Array<{ modifierPath: string, targetName: string, weight: ?number,
     *   protectedOwner: null }> }} The shapes to add; the caller sets each request's owner and each weighted occlusion's.
     * @throws {Error} For an entry no rule reads, naming the dependant kind, the entry and the file.
     */
    static dependantShapes(dependants)
    {
        const result = { requests: [], occlusions: [] };
        for (const dependant of dependants)
        {
            for (const entry of dependant.dependantModifiers)
            {
                const request = CjsCharacterAppearanceResolver.decodeUtilityShape(entry);
                if (request === null) throw CjsPaperDollInstance._MissingRule(dependant.path, "dependantModifiers", entry, dependant.metadataPath);
                result.requests.push(request);
            }
            // Its other occludes are the suppression walk's, through the owner (`dependantOccludes`).
            for (const entry of dependant.occludesModifiers.filter(value => /^utilityshapes\//iu.test(value)))
            {
                const occlusion = CjsCharacterAppearanceResolver.decodeUtilityOcclusion(entry);
                if (occlusion === null) throw CjsPaperDollInstance._MissingRule(dependant.path, "occludesModifiers", entry, dependant.metadataPath);
                result.occlusions.push({ ...occlusion, protectedOwner: null });
            }
        }
        return result;
    }

    /**
     * What a worn item's dependants occlude, for the suppression walk: every entry of each dependant's
     * `occludesModifiers` outside `utilityshapes/` (those are `dependantShapes`'), cut to its path as the owner's own
     * occludes are. The owner occludes them as if it stated them: `outer/vanguardf01` v6 brings
     * `accessories/masks/mask_big_f`, whose metadata occludes `accessories/chin`, `accessories/lips` and
     * `accessories/nose`, so the suit with that mask suppresses those piercings (operator, 2026-11-13: follow every
     * instruction the content gives).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @param {Array<{ occludesModifiers: string[] }>} dependants The dependants' metadata lists (`FetchDependantPart`).
     * @returns {string[]} The occluded paths, each once, in order.
     */
    static dependantOccludes(dependants)
    {
        const paths = [];
        for (const dependant of dependants) for (const entry of dependant.occludesModifiers)
            if (!/^utilityshapes\//iu.test(entry)) paths.push(entry.split("#")[0]);
        return [ ...new Set(paths) ];
    }

    /**
     * Which of a worn garment's dependants are there for the tuck rule (`dependantShapes`): those no worn,
     * unsuppressed garment occludes, through its own metadata or its dependants' (the `occludes` its option resolves
     * to). Visibility is resolved first, so an occluded dependant adds no utility shapes: a bottom's
     * `dependants/waisttucking/standard` occludes `dependants/drape`, so with it worn the top's drape (v6 sets
     * `pinchleftlowerhipsshape#0.2`) does not meet the waist tuck's `#2.0` (operator, 2026-11-13: "we have to resolve
     * what is and isn't visible").
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @template {{ path: string }} T
     * @param {T[]} dependants The garment's dependants, each with its lower-case modifier path.
     * @param {string[][]} occludes Each worn, unsuppressed garment's resolved occludes, its dependants' included.
     * @returns {T[]} The dependants no list occludes, in order.
     */
    static shownDependants(dependants, occludes)
    {
        return dependants.filter(dependant => !occludes.some(list => CjsPaperDollDefinition.occludes(list, dependant.path)));
    }

    /**
     * Whether a dependant's mesh draws (the drape a top lists): only a worn, unsuppressed garment's own
     * `occludesModifiers` remove it (`armorsuitcf01` lists `dependants/drape`). A dependant's occlusion of it (a
     * bottom's `dependants/waisttucking/standard`) cancels only its shapes (`shownDependants`), so a tucked tank top
     * over trousers keeps its lower part (operator, 2026-11-13).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @param {string} path The dependant's modifier path (`dependants/drape/standard`).
     * @param {string[][]} ownOccludes Each worn, unsuppressed garment's own occludes (its option's `ownOccludes`).
     * @returns {boolean} True while no garment's own metadata occludes it.
     */
    static dependantMeshShown(path, ownOccludes)
    {
        return !ownOccludes.some(list => CjsPaperDollDefinition.occludes(list, path));
    }

    /**
     * The error for a metadata entry no rule reads, worded as the library's missing category rules are
     * (`CjsCharacterLibraryManager._CategoryRule`).
     * @param {string} dependant The dependant's modifier path, whose first two folders name its kind; "" for a worn item.
     * @param {string} list The metadata list holding the entry.
     * @param {string} entry The entry as authored.
     * @param {string} metadataPath The `metadata.yaml` holding it.
     * @returns {Error} The error.
     */
    static _MissingRule(dependant, list, entry, metadataPath)
    {
        const kind = dependant ? dependant.split("/").slice(0, 2).join("/") + " " : "";
        return new Error("No paper doll rule for the " + kind + list + " entry " + entry + " in " + metadataPath);
    }

    /**
     * A target's ready capture: each part's settings (`CaptureTarget`), the suppression walk, and the ready lists the
     * composition draws. `order` is the bake order without the suppressed parts: an occluded part leaves every target's
     * bake (operator, 2026-11-09). The head's `brow` list is the parts after the eyebrows: what covers the brows on the
     * face covers them on the brow mesh.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @param {number} target The target, a `PaperDollTarget` bit.
     * @param {string[]} [names] Its parts in bake order; `GetLayerOrder`'s by default.
     * @param {{ suppressed: string[], cyclic: string[] }} [suppression] The walk; `suppress`'s by default.
     * @returns {object} The capture: each part's settings by name, `order` (the ready order), `lists`, `suppressed`,
     *   `cyclic` and `occluded`.
     */
    static ready(definition, target, names = definition.GetLayerOrder(target), suppression = CjsPaperDollInstance.suppress(definition))
    {
        const state = definition.CaptureTarget(target, names);
        const order = names.filter(name => !suppression.suppressed.includes(name));
        const brow = order.indexOf("eyebrows");
        state.order = order;
        state.lists = target === PaperDollTarget.HEAD ? { order, brow: brow === -1 ? [] : order.slice(brow + 1) } : { order };
        state.suppressed = suppression.suppressed;
        state.cyclic = suppression.cyclic;
        return state;
    }

    /**
     * The targets after the foundation, in binding order. `whenSelected` skips a
     * target while none of its parts has a selection, before or after the edit;
     * `reads` names a target whose rebuilt output this one draws over.
     */
    static targetOrder = [
        { target: PaperDollTarget.SKIN, binding: "skin", whenSelected: true, reads: 0 },
        { target: PaperDollTarget.SURFACE, binding: "surface", whenSelected: true, reads: 0 },
        { target: PaperDollTarget.EYES, binding: "eyes", whenSelected: false, reads: 0 },
        { target: PaperDollTarget.HEAD, binding: "head", whenSelected: false, reads: PaperDollTarget.SKIN },
        { target: PaperDollTarget.BODY, binding: "body", whenSelected: false, reads: PaperDollTarget.SKIN }
    ];

}
