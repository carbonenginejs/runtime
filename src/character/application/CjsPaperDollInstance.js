import { CjsSchema, meta } from "#schema";
import { CjsCharacterAppearanceResolver } from "../model/resolution/CjsCharacterAppearanceResolver.js";
import { CjsPaperDollDefinition } from "./CjsPaperDollDefinition.js";
import { CjsCharacterLibraryManager } from "../library/CjsCharacterLibraryManager.js";
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

    /**
     * The parts that cannot be worn together, each group its definition members (`exclusiveParts`). The library's
     * setting (`CjsCharacterLibraryManager.GetExclusiveParts`): its defaults file until the host sets the library's
     * current groups here.
     * @type {string[][]}
     */
    exclusive = CjsCharacterLibraryManager.exclusivePartDefaults();

    /** The part each `exclusive` group last wore, by group index (`exclusiveParts`). */
    _exclusiveWorn = new Map();

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
        CjsPaperDollInstance.exclusiveParts(definition, this._exclusiveWorn, this.exclusive);
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
     * Keeps at most one part of each group worn (on with an option): when two are, the one switched on last stays and
     * the others are switched off. With no earlier state (a restored character wearing both), the later part in the
     * group stays.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library holds the groups
     * (`CjsCharacterLibraryManager.GetExclusiveParts`, defaults file `exclusiveParts.json`); this applies them.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @param {Map<number, ?string>} last The part each group wore at the previous call, by group index; updated.
     * @param {string[][]} groups The groups, each its definition members.
     * @returns {string[]} The parts switched off.
     */
    static exclusiveParts(definition, last, groups)
    {
        const off = [];
        for (const [ index, group ] of groups.entries())
        {
            const worn = group.filter(name => definition[name].enabled && definition[name].option !== "");
            const keep = worn.length > 1 ? worn.findLast(name => name !== last.get(index)) : worn[0] ?? null;
            for (const name of worn) if (name !== keep) { CjsSchema.setValues(definition[name], { enabled: false }); off.push(name); }
            last.set(index, keep);
        }
        return off;
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
     * Whether a body carrier is shown: not while a worn item fills its category (a shoe is a `feet` option, as
     * `feet_nude` is) or occludes its category or path (`bottomouter/spacesuit_01` occludes `bottominner`; jackets
     * the sleeves); and a garment's own body piece (`garment`, from the library's `garmentDependants`) only while a
     * worn item names it among its dependants.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {{ part: string, category: string, path: string, garment: boolean }} carrier The carrier: its lower-case
     *   part path, its category and the path occlusions are matched against.
     * @param {Array<{ category: string, occludes: string[], dependants: string[] }>} worn The worn items.
     * @returns {boolean} Whether it is shown.
     */
    static carrierShown(carrier, worn)
    {
        if (carrier.garment && !worn.some(item => item.dependants.some(path => path.toLowerCase() === carrier.part))) return false;
        return !worn.some(item => item.category === carrier.category
            || item.occludes.some(target => target === carrier.category || CjsPaperDollDefinition.occludes([ target ], carrier.path)));
    }

    /**
     * The nude carrier area effects the composed cut mask clips, by the library's rule
     * (`CjsCharacterLibraryManager.GetBodyCarriers().cutMaskClip`): those holding the rule's mask resource whose
     * influence parameter is above its threshold. The caller sets the rule's clip parameter on them and passes only
     * nude carriers' areas: a garment's own body piece is the garment's, and its mask would cut it away.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library holds the rule; this applies it.
     * @param {object[]} effects The nude carriers' area effects (`Tr2Effect`).
     * @param {{ resource: string, influence: string, above: number }} rule The library's `cutMaskClip`.
     * @returns {object[]} The effects to clip, in the given order.
     */
    static cutMaskClipEffects(effects, rule)
    {
        return effects.filter(effect =>
        {
            const influence = effect.FindParameterByName(rule.influence);
            return effect.GetResourceByName(rule.resource) !== null && influence !== null && influence.GetValue() > rule.above;
        });
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
     * @param {Array<{ path: string, shapes: { requests: object[], occlusions: object[] } }>} dependants The garment's
     *   dependants as the library hands them out, decoded (`CjsCharacterLibraryManager.FetchDependantPart`).
     * @returns {{ requests: object[], occlusions: Array<{ modifierPath: string, targetName: string, weight: ?number,
     *   protectedOwner: null }> }} The shapes to add; the caller sets each request's owner and each weighted occlusion's.
     * @throws {Error} For an entry no rule reads, naming the dependant kind, the entry and the file.
     */
    static dependantShapes(dependants)
    {
        return { requests: dependants.flatMap(dependant => dependant.shapes.requests), occlusions: dependants.flatMap(dependant => dependant.shapes.occlusions) };
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
     * @param {Array<{ occludes: string[] }>} dependants The dependants as the library hands them out, decoded (`FetchDependantPart`).
     * @returns {string[]} The occluded paths, each once, in order.
     */
    static dependantOccludes(dependants)
    {
        return [ ...new Set(dependants.flatMap(dependant => dependant.occludes)) ];
    }

    /**
     * Which of a worn garment's dependants are there for the tuck rule (`dependantShapes`): the same ones whose mesh
     * draws (`dependantMeshShown`), those no worn, unsuppressed garment's own `occludesModifiers` remove. A dependant is
     * there or not as a whole, mesh and shapes together (operator, 2026-11-13: "we have to resolve what is and isn't
     * visible"). Dropping the shapes of a drape that still draws left `pushdrapeshape` unset, so a waistband (a
     * bottom whose `dependants/waisttucking/standard` occludes `dependants/drape`) cut through it. The conflicts its
     * shapes meet (the drape's `pinchleftlowerhipsshape#0.2` against the waist tuck's `#2.0`) resolve by layer
     * (`CjsCharacterAppearanceResolver.resolveUtilityShapes`).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library stores the metadata; this applies it.
     * @template {{ path: string }} T
     * @param {T[]} dependants The garment's dependants, each with its lower-case modifier path.
     * @param {string[][]} ownOccludes Each worn, unsuppressed garment's own occludes (its option's `ownOccludes`).
     * @returns {T[]} The dependants no list removes, in order.
     */
    static shownDependants(dependants, ownOccludes)
    {
        return dependants.filter(dependant => CjsPaperDollInstance.dependantMeshShown(dependant.path, ownOccludes));
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
