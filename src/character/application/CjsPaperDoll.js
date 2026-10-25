import { CjsPaperDollScars } from "./CjsPaperDollScars.js";
import { CjsPaperDollAging } from "./CjsPaperDollAging.js";
import { CjsPaperDollScarring } from "./CjsPaperDollScarring.js";
import { CjsPaperDollFreckles } from "./CjsPaperDollFreckles.js";
import { CjsPaperDollSkin } from "./CjsPaperDollSkin.js";
import { meta, type } from "#schema";
import { CjsPaperDollArchetype } from "./CjsPaperDollArchetype.js";
import { CjsPaperDollEyes } from "./CjsPaperDollEyes.js";
import { CjsPaperDollEyebrows } from "./CjsPaperDollEyebrows.js";
import { CjsPaperDollBlush } from "./CjsPaperDollBlush.js";
import { CjsPaperDollTattoo } from "./CjsPaperDollTattoo.js";
import { CjsPaperDollLipstick } from "./CjsPaperDollLipstick.js";
import { CjsPaperDollBottomUnderwear } from "./CjsPaperDollBottomUnderwear.js";
import { CjsPaperDollTopUnderwear } from "./CjsPaperDollTopUnderwear.js";
import { CjsPaperDollEyeshadow } from "./CjsPaperDollEyeshadow.js";
import { CjsPaperDollAugmentations } from "./CjsPaperDollAugmentations.js";
import { CjsPaperDollBodyAugmentation } from "./CjsPaperDollBodyAugmentation.js";
import { CjsPaperDollArmLeft } from "./CjsPaperDollArmLeft.js";
import { CjsPaperDollArmRight } from "./CjsPaperDollArmRight.js";
import { CjsPaperDollEyeliner } from "./CjsPaperDollEyeliner.js";
import { PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned foundation and appearance coordinator: a generic
 * collector over its parts. Each part class stamps its bake rank and the
 * passes it feeds; the doll captures every pass a part feeds, in bake order,
 * and calls that pass's prepared synchronous binding outside a render pass.
 * The head binding composes shared diffuse contributors; the surface binding
 * owns normal and specular contributors. Parts own no effects.
 */
@meta.define("CjsPaperDoll")
export class CjsPaperDoll
{
    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyes")
    eyes = new CjsPaperDollEyes();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyebrows")
    eyebrows = new CjsPaperDollEyebrows();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBlush")
    blush = new CjsPaperDollBlush();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArchetype")
    archetype = new CjsPaperDollArchetype();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollSkin")
    skin = new CjsPaperDollSkin();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollFreckles")
    freckles = new CjsPaperDollFreckles();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollAging")
    aging = new CjsPaperDollAging();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollScarring")
    scarring = new CjsPaperDollScarring();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollScars")
    scars = new CjsPaperDollScars();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTattoo")
    tattoo = new CjsPaperDollTattoo();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollLipstick")
    lipstick = new CjsPaperDollLipstick();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollAugmentations")
    augmentations = new CjsPaperDollAugmentations();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBodyAugmentation")
    bodyAugmentation = new CjsPaperDollBodyAugmentation();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArmLeft")
    armLeft = new CjsPaperDollArmLeft();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArmRight")
    armRight = new CjsPaperDollArmRight();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeshadow")
    eyeshadow = new CjsPaperDollEyeshadow();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeliner")
    eyeliner = new CjsPaperDollEyeliner();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomUnderwear")
    bottomUnderwear = new CjsPaperDollBottomUnderwear();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTopUnderwear")
    topUnderwear = new CjsPaperDollTopUnderwear();

    /** The collected parts, by member name. Each pass composes its parts by bake rank, not by this order. */
    static parts = [ "skin", "eyes", "eyebrows", "blush", "freckles", "aging", "scarring", "scars", "tattoo", "augmentations", "bodyAugmentation", "armLeft", "armRight", "eyeshadow", "eyeliner", "lipstick", "bottomUnderwear", "topUnderwear" ];

    /**
     * The passes after the foundation, in binding order. `whenSelected` skips a
     * pass while none of its parts has a selection, before or after the edit;
     * `reads` names a pass whose rebuilt output this one draws over.
     */
    static passOrder = [
        { pass: PaperDollPass.SKIN, binding: "skin", whenSelected: true, reads: 0 },
        { pass: PaperDollPass.SURFACE, binding: "surface", whenSelected: true, reads: 0 },
        { pass: PaperDollPass.EYES, binding: "eyes", whenSelected: false, reads: 0 },
        { pass: PaperDollPass.HEAD, binding: "head", whenSelected: false, reads: PaperDollPass.SKIN },
        { pass: PaperDollPass.BODY, binding: "body", whenSelected: false, reads: PaperDollPass.SKIN }
    ];

    _appliedFoundation = null;
    _applied = new Map();
    _layers = new Map();
    _dirty = true;
    _passDirty = 0;
    _applying = false;

    /** Forces the selected foundation and every pass on the next Update. */
    Rebuild()
    {
        this._dirty = true;
        this.archetype.Rebuild();
        for (const name of CjsPaperDoll.parts) this[name].Rebuild();
    }

    /** Invalidates the shared output when a prepared external layer changes. */
    RebuildHead() { this._passDirty |= PaperDollPass.HEAD; }

    /**
     * A part's bake rank: its class's `layer`, or the override `SetLayer` installed.
     * @param {string} name The part's member name.
     * @returns {number|null}
     */
    GetLayer(name) { return this._layers.has(name) ? this._layers.get(name) : this[name].constructor.layer; }

    /**
     * Overrides a part's bake rank, to place a layer by eye against the game,
     * and rebuilds every pass the part feeds. The class rank stays the default.
     * @param {string} name The part's member name.
     * @param {number} layer The rank to compose it at.
     */
    SetLayer(name, layer)
    {
        if (!Number.isFinite(layer)) throw new RangeError("A layer rank must be a finite number");
        this._layers.set(name, layer);
        this._passDirty |= this[name].constructor.passes;
    }

    /** Restores every part's class rank. */
    ResetLayers()
    {
        for (const name of this._layers.keys()) this._passDirty |= this[name].constructor.passes;
        this._layers.clear();
    }

    /**
     * The parts feeding a pass, in bake order; parts with no rank come first and
     * equal ranks keep `parts` order.
     * @param {PaperDollPass} pass
     * @returns {string[]}
     */
    GetLayerOrder(pass)
    {
        const order = CjsPaperDoll.parts.filter(name => this[name].constructor.passes & pass)
            .sort((a, b) => (this.GetLayer(a) ?? -Infinity) - (this.GetLayer(b) ?? -Infinity) || 0);
        // An active occluder draws after every active part it occludes, so in each shared pass it covers them
        // exactly where its own coverage is (operator, 2026-10-25: occlusion covers only what it covers).
        for (const occluder of [ ...order ])
        {
            const targets = this._Occludes(occluder);
            if (!targets.length) continue;
            const at = order.indexOf(occluder);
            const last = order.reduce((found, name, index) => name !== occluder && this._IsOccludedBy(name, targets) ? index : found, -1);
            if (last > at)
            {
                order.splice(at, 1);
                order.splice(last, 0, occluder);
            }
        }
        return order;
    }

    /**
     * What a part's selected option occludes: the `occludesModifiers` of its
     * metadata (recipe categories or part paths), empty while it is off.
     * @param {string} name The part's member name.
     * @returns {string[]}
     */
    _Occludes(name)
    {
        const part = this[name];
        if (!part.enabled || !part.option) return [];
        return part.GetOptions().find(option => option.id === part.option)?.occludes ?? [];
    }

    /** Whether a part's selected option matches an occlusion target, by its category or its path. */
    _IsOccludedBy(name, targets)
    {
        const part = this[name];
        if (!part.enabled || !part.option) return false;
        const path = part.GetOptions().find(option => option.id === part.option)?.path ?? "";
        return targets.some(target => target === part.constructor.category || CjsPaperDoll.occludes([ target ], path));
    }

    /**
     * Every occlusion target of the active options, sorted: recipe categories
     * and modifier paths, including geometry the doll does not collect (the
     * brow base a face paint occludes).
     * @returns {string[]}
     */
    GetOccluded()
    {
        return [ ...new Set(CjsPaperDoll.parts.flatMap(name => this._Occludes(name))) ].sort();
    }

    /**
     * Whether occlusion targets cover a modifier path: a target names the path
     * itself or a folder above it (`accessories/browbase` covers
     * `accessories/browbase/browbase_01`).
     * @param {string[]} targets Occlusion targets, as `GetOccluded` returns them.
     * @param {string} path A modifier path below the paper doll root.
     * @returns {boolean}
     */
    static occludes(targets, path)
    {
        return path !== "" && targets.some(target => target === path || path.startsWith(target + "/"));
    }

    /**
     * One pass's captured settings: `order` lists its parts in bake order,
     * `occluded` the active occlusion targets, then each part's capture under its name.
     */
    _CapturePass(pass, names)
    {
        const state = { order: names, occluded: this.GetOccluded() };
        for (const name of names) state[name] = this[name].Capture(pass);
        return state;
    }

    /** Compares only fields which can affect a part's output: its scalars, and the colours of the areas it uses. */
    _Changed(state, previous)
    {
        if (!previous) return true;
        for (const key in state) if (key !== "colors" && key !== "colorAreas" && state[key] !== previous[key]) return true;
        return state.colorAreas.length !== previous.colorAreas.length
            || state.colorAreas.some((area, index) => area !== previous.colorAreas[index]
                || state.colors[area - 1].some((value, channel) => value !== previous.colors[area - 1][channel]));
    }

    /**
     * Collects edits once, then applies the foundation and each pass in
     * `passOrder`, calling a pass's binding only when its captured settings
     * changed. Successful passes are acknowledged independently; failed passes
     * retry. Edits made during a binding remain dirty for the following Update.
     * @param {{foundation: Function, skin: Function, surface: Function, eyes: Function, head: Function, body: Function}} bindings Prepared synchronous bindings.
     * @returns {boolean} Whether any output was rebuilt.
     */
    Update(bindings)
    {
        if (this._applying) return false;
        const foundationPending = this.archetype.IsDirty();
        const foundation = foundationPending ? this.archetype.Resolve() : this._appliedFoundation;
        // A geometry-only strength edit must not rebuild skin or cosmetic maps.
        const forced = this.archetype.IsFoundationDirty() || this._dirty;
        const plans = [];
        let changedPasses = 0;
        for (const { pass, binding, whenSelected, reads } of CjsPaperDoll.passOrder)
        {
            const names = this.GetLayerOrder(pass);
            const previous = this._applied.get(pass) ?? null;
            // A shape-dependent part (a tattoo baked from the morphed face) rebuilds on any foundation edit.
            const reshaped = foundationPending && names.some(name => this[name].constructor.shapeDependent && this[name].enabled && this[name].option !== "");
            const passForced = forced || reshaped || (this._passDirty & pass) !== 0 || (changedPasses & reads) !== 0;
            const pending = passForced || !previous || names.some(name => this[name].IsDirty());
            const state = pending ? this._CapturePass(pass, names) : previous;
            const selected = !whenSelected || names.some(name => state[name].option || (previous !== null && previous[name].option));
            const changed = pending && selected && (passForced || !previous || state.order.join() !== previous.order.join() || state.occluded.join() !== previous.occluded.join() || names.some(name => this._Changed(state[name], previous[name])));
            if (changed) changedPasses |= pass;
            plans.push({ pass, binding, names, state, changed });
        }

        this._dirty = false;
        this._passDirty = 0;
        this.archetype.ClearDirty();
        for (const name of CjsPaperDoll.parts) this[name].ClearDirty();
        this._applying = true;
        try
        {
            if (foundationPending) bindings.foundation(foundation);
            this._appliedFoundation = foundation;
            for (const plan of plans)
            {
                if (plan.changed) bindings[plan.binding](plan.state);
                this._applied.set(plan.pass, plan.state);
            }
        }
        catch (error)
        {
            if (foundationPending && this._appliedFoundation !== foundation) this.archetype.Rebuild();
            // Do not discard a later pass's pending edits if an earlier apply fails.
            for (const plan of plans) if (this._applied.get(plan.pass) !== plan.state)
            {
                this._applied.delete(plan.pass);
                for (const name of plan.names) this[name].Rebuild();
            }
            throw error;
        }
        finally { this._applying = false; }
        return foundationPending || changedPasses !== 0;
    }
}
