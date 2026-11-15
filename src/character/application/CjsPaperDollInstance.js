import { meta } from "#schema";
import { blue } from "#blue";
import { CjsCharacterAppearanceResolver } from "../model/resolution/CjsCharacterAppearanceResolver.js";
import { CjsPaperDollDefinition } from "./CjsPaperDollDefinition.js";
import { CjsCharacterLibraryManager } from "../library/CjsCharacterLibraryManager.js";
import { PaperDollTarget } from "./paperDollOrder.js";
import { TriGeometryRes } from "../../trinity/resources/geometry/TriGeometryRes.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

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

    /** The part each exclusive group last wore, by group index (`exclusiveParts`). */
    _exclusiveWorn = new Map();

    /** The last update's suppression walk: the suppressed parts and the parts a cycle kept active. */
    _suppression = { suppressed: [], cyclic: [] };

    /** The skinned objects drawn for this character, added to a scene by its manager. */
    objects = [];

    /**
     * Attaches the instance to its target bindings and drawn objects; construction is inert.
     * @param {{error: Function, foundation: Function, skin: Function, surface: Function, eyes: Function, head: Function, body: Function}} bindings
     *   Prepared synchronous bindings, one per target: each receives that target's capture (the foundation binding the
     *   resolved foundation); and `error`, required, which receives the message of a failure the instance meets outside a
     *   target (a held part whose option fails to resolve, `holdParts`).
     * @param {object[]} [objects=[]] The skinned objects drawn for this character.
     * @throws {TypeError} For bindings without an `error` function.
     * @returns {CjsPaperDollInstance} This instance.
     */
    Initialize(bindings, objects = [])
    {
        if (typeof bindings.error !== "function") throw new TypeError("CjsPaperDollInstance needs an error binding");
        this._bindings = bindings;
        this.objects = objects;
        return this;
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
        CjsPaperDollInstance.exclusiveParts(definition, this._exclusiveWorn, blue.characterLibrary.GetExclusiveParts());
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
     * (`CjsCharacterLibraryManager.GetExclusiveParts`); this applies them.
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
            for (const name of worn) if (name !== keep) { definition[name].enabled = false; definition[name].OnModified("enabled"); off.push(name); }
            last.set(index, keep);
        }
        return off;
    }

    /**
     * Holds the parts that are not overridable (`CjsPaperDollComponent.overridable`): a part
     * switched off while no part that is still worn (on, resolved, and not itself suppressed: `suppress` over the parts as
     * they are) occludes it is switched back on, and its option resolved if it is not. Coverage is decided once, before the
     * held parts return, so holding and suppressing do not loop; an occluder still removes a held part from every bake
     * (`suppress`, run after). The host's switch only reflects this. `Update` reports a failed
     * resolution through the host's `error` binding.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
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
            const target = { name, category: CjsCharacterLibraryManager.partCategory(name), path: option.path ?? CjsCharacterLibraryManager.partCategory(name) };
            if (worn.some(by => CjsPaperDollInstance._Occludes(by, target))) continue;
            part.enabled = true;
            part.OnModified("enabled");
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
            return { name, category: CjsCharacterLibraryManager.partCategory(name), path: option.path ?? CjsCharacterLibraryManager.partCategory(name), occludes: option.occludes ?? [] };
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
     * target's bake (`ready`): occlusion drops, everywhere.
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
     * Each drawn dependant mesh's state for one update, by the library's entries
     * (`CjsCharacterLibraryManager.FetchMeshDependants`): shown while its owner is worn with an option, not suppressed,
     * its resolved garment lists the dependant, and no worn garment's own occludes remove it (`dependantMeshShown`);
     * its version is the owner's state field while shown, else 0.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python. The library holds the entries; this applies them.
     * @param {Array<{ path: string, owner: string, state: string, parameters: Object<string, number[]>, diffuseSize: number[] }>} entries The library's entries.
     * @param {object} value The definition's values as the update applies them (`value[member].option` and the state field).
     * @param {Set<string>} suppressed The suppressed members (`suppress`).
     * @param {(member: string, option: string) => string[]} dependantsOf The resolved garment's dependants.
     * @param {string[][]} ownOccludes The worn, unsuppressed garments' own occludes (`dependantMeshShown`).
     * @returns {Array<{ path: string, owner: string, shown: boolean, state: number }>} One per entry, in order.
     */
    static meshDependantStates(entries, value, suppressed, dependantsOf, ownOccludes)
    {
        return entries.map(entry =>
        {
            const owner = value[entry.owner];
            const shown = owner.option !== "" && !suppressed.has(entry.owner) && dependantsOf(entry.owner, owner.option).includes(entry.path)
                && CjsPaperDollInstance.dependantMeshShown(entry.path, ownOccludes);
            return { path: entry.path, owner: entry.owner, shown, state: shown ? owner[entry.state] : 0 };
        });
    }

    /**
     * Sets one area's effect to the values the library resolved for it (`CjsCharacterLibraryManager.FetchModelAreas`,
     * an area's `setup`): each texture through `SetResourceTexture2D`, each parameter through `SetParameter__Vector4`.
     * The library has resolved and merged them, leaving out what the area already holds; this sets them.
     *
     * Modelled on: the per-area half of EveSOF::FillMeshAreaVector (EveSOF.cpp:816-883), which adds the generic
     * shader's textures and parameters to an effect it has just created.
     * @adapted a parameter is set as a dynamic Vector4 that replaces the authored one: Carbon adds a constant parameter
     *   (`AddParameterVector4`, Tr2Effect.cpp:484-497, checking only constants, :1611-1623) beside an authored dynamic one,
     *   and a paper doll area's `.black` authors its `TransformUV0`, which must take the area's placement.
     * @param {object} effect The area's `Tr2Effect`.
     * @param {import("../library/CjsCharacterLibraryManager.js").CjsCharacterAreaValues} setup The area's setup.
     * @returns {void}
     */
    static applyAreaSetup(effect, setup)
    {
        for (const [ name, path ] of Object.entries(setup.textures)) effect.SetResourceTexture2D(name, path);
        for (const [ name, value ] of Object.entries(setup.parameters)) effect.SetParameter__Vector4(name, value);
    }

    static scratch = { vec3_0: vec3.create(), vec4_0: vec4.create() };

    /** Each garment mesh's share of vertices on a carrier mesh, by garment mesh then carrier mesh (`meshCopyShare`). */
    static _copyShares = new WeakMap();

    /**
     * A nude carrier's cut-mask shells, by the library's `cutMaskClip` rule: the meshes whose every area is transparent
     * with the rule's influence parameter above its threshold (`torso_nude`'s `Torso5Shape`, `BridgeShape` and
     * `Torso4Shape`). Whether they draw is the library's `shells.draw`.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {object[]} meshes The carrier's `Tr2Mesh`es.
     * @param {{ influence: string, above: number }} rule The library's `cutMaskClip`.
     * @returns {object[]} The shells, in the given order.
     */
    static carrierShells(meshes, rule)
    {
        return meshes.filter(mesh => !mesh.opaqueAreas.length && !mesh.decalAreas.length && mesh.transparentAreas.length > 0
            && mesh.transparentAreas.every(area =>
            {
                const influence = area.effect.FindParameterByName(rule.influence);
                return influence !== null && influence.GetValue() > rule.above;
            }));
    }

    /**
     * Sets the backing areas' cutout weight by the library's `backingCutout` rule: each opaque and decal area of the
     * meshes whose cutout colour parameter has a weight above the rule's keeps its colour with the rule's weight, so it
     * draws the composite instead of darkening towards its cutout colour.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {object[]} meshes A carrier's `Tr2Mesh`es.
     * @param {{ parameter: string, alpha: number }} rule The library's `backingCutout`.
     * @returns {void}
     */
    static clearBackingCutout(meshes, rule)
    {
        const { vec4_0 } = CjsPaperDollInstance.scratch;
        for (const mesh of meshes) for (const area of [ ...mesh.opaqueAreas, ...mesh.decalAreas ])
        {
            const cutout = area.effect.FindParameterByName(rule.parameter);
            if (cutout === null || cutout.value[3] <= rule.alpha) continue;
            cutout.SetValue(vec4.set(vec4_0, cutout.value[0], cutout.value[1], cutout.value[2], rule.alpha));
        }
    }

    /**
     * A mesh's bind-pose vertex positions as keys at a position scale (`meshCopy.positionScale`: 10000 keys them to
     * 0.1 mm), from its geometry's resident CPU payload.
     *
     * Ours (no Carbon counterpart).
     * @param {object} mesh A loaded `Tr2Mesh`.
     * @param {number} scale The position scale.
     * @returns {Set<string>} The position keys.
     */
    static meshPositionKeys(mesh, scale)
    {
        const { vec3_0 } = CjsPaperDollInstance.scratch;
        const positions = TriGeometryRes.getMeshPositions(mesh.GetGeometryResource().RequireIntersectionMeshes()[mesh.meshIndex]);
        const keys = new Set();
        for (let index = 0; index < TriGeometryRes.getPositionCount(positions); index++)
            if (TriGeometryRes.copyPosition(vec3_0, positions, index)) keys.add(Math.round(vec3_0[0] * scale) + "," + Math.round(vec3_0[1] * scale) + "," + Math.round(vec3_0[2] * scale));
        return keys;
    }

    /**
     * The share of a garment mesh's bind-pose vertices that sit on a carrier mesh's (`meshPositionKeys`), cached per
     * pair. A garment mesh of a carrier mesh's name is the carrier's copy at the library's `meshCopy.share` or above.
     *
     * Ours (no Carbon counterpart).
     * @param {object} copy The garment's `Tr2Mesh`.
     * @param {object} mesh The carrier's `Tr2Mesh`.
     * @param {number} scale The position scale (`meshCopy.positionScale`).
     * @returns {number} From 0 to 1.
     */
    static meshCopyShare(copy, mesh, scale)
    {
        let byMesh = CjsPaperDollInstance._copyShares.get(copy);
        if (!byMesh) CjsPaperDollInstance._copyShares.set(copy, byMesh = new WeakMap());
        if (!byMesh.has(mesh))
        {
            const keys = CjsPaperDollInstance.meshPositionKeys(mesh, scale), own = CjsPaperDollInstance.meshPositionKeys(copy, scale);
            let on = 0;
            for (const key of own) if (keys.has(key)) on++;
            byMesh.set(mesh, own.size ? on / own.size : 0);
        }
        return byMesh.get(mesh);
    }

    /**
     * Whether a garment's body piece replaces a whole nude carrier: one of its meshes has a carrier mesh's name and
     * every one of its vertices on that mesh's (the collar's `Torso4Shape` is `torso_nude`'s). The carrier was cut down
     * to make it, so it hides while the piece shows.
     *
     * Ours (no Carbon counterpart).
     * @param {object[]} pieceMeshes The garment piece's `Tr2Mesh`es.
     * @param {object[]} carrierMeshes The nude carrier's `Tr2Mesh`es.
     * @param {number} scale The position scale (`meshCopy.positionScale`).
     * @returns {boolean} Whether it replaces the carrier.
     */
    static meshReplacesWhole(pieceMeshes, carrierMeshes, scale)
    {
        return pieceMeshes.some(copy =>
        {
            const original = carrierMeshes.find(mesh => mesh.name === copy.name);
            if (!original) return false;
            const keys = CjsPaperDollInstance.meshPositionKeys(original, scale);
            return [ ...CjsPaperDollInstance.meshPositionKeys(copy, scale) ].every(key => keys.has(key));
        });
    }

    /**
     * Whether a carrier mesh draws: its carrier is shown (`carrierShown`) and not replaced whole by a shown garment
     * piece (`meshReplacesWhole`); it is not a shell while shells do not draw (`carrierShells`, `shells.draw`); and a
     * nude carrier's mesh is not copied by a shown garment model (`meshCopyShare` at `meshCopy.share` or above). A
     * garment's own body piece draws whole.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {{ shown: boolean, garment: boolean, replaced: boolean, shell: boolean, copyShares: number[] }} mesh The
     *   mesh's facts: its carrier's state, whether it is a shell, and each same-named shown garment mesh's share.
     * @param {{ meshCopy: { share: number }, shells: { draw: boolean } }} carriers The library's body carriers.
     * @returns {boolean} Whether it draws.
     */
    static carrierMeshDrawn(mesh, carriers)
    {
        if (!mesh.shown || mesh.replaced) return false;
        if (mesh.shell && !carriers.shells.draw) return false;
        return mesh.garment || !mesh.copyShares.some(share => share >= carriers.meshCopy.share);
    }

    /**
     * The nude carrier area effects the composed cut mask clips, by the library's rule
     * (`CjsCharacterLibraryManager.FetchBodyCarriers(sex)`, its `cutMaskClip`): those holding the rule's mask resource whose
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
     * authored, with no filtering by kind or target: what the garments' metadata says is done exactly. `hidesBootShin` does not select them; both directions set it differently. The result goes to
     * `resolveUtilityShapes` with the worn items' own requests and occlusions. Every entry a dependant's metadata
     * states has a rule or throws: a request that names no utility shape and a
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
     * `accessories/nose`, so the suit with that mask suppresses those piercings: every instruction the content
     * gives is followed.
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
     * there or not as a whole, mesh and shapes together: what is and is not visible is resolved first. Dropping the shapes of a drape that still draws left `pushdrapeshape` unset, so a waistband (a
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
     * over trousers keeps its lower part.
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
     * The fitting of the worn items (garments, the shown body carriers, hair and accessories): every item is active
     * unless the suppression walk suppressed its owner (a shown carrier is never occluded by an active item, so never
     * suppressed). The active items' utility shapes resolve by `resolveUtilityShapes`: an occluded shape is dropped,
     * and a conflict between weighted settings goes to the paper doll part in the higher layer (`GetLayer`); a body
     * carrier has no layer. Differing weights left unresolved apply nothing.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings.
     * @param {Array<{ owner: string, requests: object[], occlusions: object[] }>} items The worn items, each with its
     *   owner (a paper doll part or a carrier) and its decoded utility-shape requests and occlusions.
     * @param {{ suppressed: string[], cyclic: string[] }} suppression The suppression walk (`GetSuppression`).
     * @returns {{ weights: Object<string, number>, suppressed: string[], conflicts: string[], inactive: string[],
     *   cyclic: string[] }} The morph weights by lower-case target name, the modifier paths with suppressed requests,
     *   the paths in conflict, the suppressed items' owners and the walk's cyclic parts.
     */
    static fitting(definition, items, suppression)
    {
        const { suppressed, cyclic } = suppression;
        const active = items.filter(item => !suppressed.includes(item.owner));
        const layer = owner => CjsPaperDollDefinition.parts.includes(owner) ? definition.GetLayer(owner) : null;
        const groups = CjsCharacterAppearanceResolver.resolveUtilityShapes(active.flatMap(item => item.requests), active.flatMap(item => item.occlusions), layer);
        const weights = {};
        for (const group of groups) if (!group.conflict) for (const request of group.retained) weights[request.targetName.toLowerCase()] = request.weight;
        return {
            weights,
            suppressed: groups.filter(group => group.suppressed.length).map(group => group.modifierPath),
            conflicts: groups.filter(group => group.conflict).map(group => group.modifierPath),
            inactive: items.filter(item => suppressed.includes(item.owner)).map(item => item.owner),
            cyclic
        };
    }


    /**
     * A target's ready capture: each part's settings (`CaptureTarget`), the suppression walk, and the ready lists the
     * composition draws. `order` is the bake order without the suppressed parts: an occluded part leaves every target's
     * bake. The head's `brow` list is the parts after the eyebrows: what covers the brows on the
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
