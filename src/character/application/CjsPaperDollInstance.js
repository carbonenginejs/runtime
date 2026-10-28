import { meta } from "#schema";
import { PaperDollPass } from "./paperDollOrder.js";

/**
 * One built paper doll character: what was made from a definition. It owns
 * its pass bindings (the prepared compositions, their targets and effects),
 * the skinned objects drawn for it, and the captured settings each pass was
 * last built from. Nothing an instance builds is shared with another instance
 * (operator, 25 October 2026: characters own their state until sharing is
 * proven).
 *
 * `Update` captures each pass from the definition in bake order and calls
 * that pass's binding only when its capture changed. Bindings are synchronous
 * and run outside a render pass.
 *
 * An application class (operator-approved character application); no Carbon
 * donor.
 */
@meta.define("CjsPaperDollInstance")
export class CjsPaperDollInstance
{

    _bindings = null;

    _appliedFoundation = null;

    _applied = new Map();

    _passDirty = 0;

    _applying = false;

    /** The skinned objects drawn for this character, added to a scene by its manager. */
    objects = [];

    /**
     * @param {{foundation: Function, skin: Function, surface: Function, eyes: Function, head: Function, body: Function}} bindings
     *   Prepared synchronous bindings, one per pass: each receives that pass's capture (the foundation binding the resolved foundation).
     * @param {object[]} [objects=[]] The skinned objects drawn for this character.
     */
    constructor(bindings, objects = [])
    {
        this._bindings = bindings;
        this.objects = objects;
    }

    /**
     * Rebuilds the head pass on the next `Update`, for a prepared layer whose
     * inputs finished loading after its option was selected.
     * @returns {void}
     */
    RebuildHead()
    {
        this.RebuildPasses(PaperDollPass.HEAD);
    }

    /**
     * Rebuilds passes on the next `Update`, for an option whose inputs finished
     * loading after it was selected (options load on first selection).
     * @param {number} passes The passes to rebuild, as `PaperDollPass` bits.
     * @returns {void}
     */
    RebuildPasses(passes)
    {
        this._passDirty |= passes;
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
     * each pass in `passOrder`, calling a pass's binding only when its captured
     * settings changed. Successful passes are acknowledged independently;
     * failed passes retry. Edits made during a binding remain dirty for the
     * following Update.
     * @param {import("./CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The settings to build from.
     * @returns {boolean} Whether any output was rebuilt.
     * @throws {Error} Whatever a binding throws; the failed passes are rebuilt on the next Update.
     */
    Update(definition)
    {
        if (this._applying) return false;
        const archetype = definition.archetype;
        const foundationPending = archetype.IsDirty();
        const foundation = foundationPending ? archetype.Resolve() : this._appliedFoundation;
        // A geometry-only strength edit must not rebuild skin or cosmetic maps.
        const forced = definition.IsForced();
        const dirtyPasses = definition.GetDirtyPasses() | this._passDirty;
        const plans = [];
        let changedPasses = 0;
        for (const { pass, binding, whenSelected, reads } of CjsPaperDollInstance.passOrder)
        {
            const names = definition.GetLayerOrder(pass);
            const previous = this._applied.get(pass) ?? null;
            // A shape-dependent part (a tattoo baked from the morphed face) rebuilds on any foundation edit.
            const reshaped = foundationPending && names.some(name => definition[name].constructor.shapeDependent && definition[name].enabled && definition[name].option !== "");
            const passForced = forced || reshaped || (dirtyPasses & pass) !== 0 || (changedPasses & reads) !== 0;
            const pending = passForced || !previous || names.some(name => definition[name].IsDirty());
            const state = pending ? definition.CapturePass(pass, names) : previous;
            const selected = !whenSelected || names.some(name => state[name].option || (previous !== null && previous[name].option));
            const changed = pending && selected && (passForced || !previous || state.order.join() !== previous.order.join() || state.occluded.join() !== previous.occluded.join() || names.some(name => this._Changed(state[name], previous[name])));
            if (changed) changedPasses |= pass;
            plans.push({ pass, binding, names, state, changed });
        }

        definition.ClearDirty();
        this._passDirty = 0;
        this._applying = true;
        try
        {
            if (foundationPending) this._bindings.foundation(foundation);
            this._appliedFoundation = foundation;
            for (const plan of plans)
            {
                if (plan.changed) this._bindings[plan.binding](plan.state);
                this._applied.set(plan.pass, plan.state);
            }
        }
        catch (error)
        {
            if (foundationPending && this._appliedFoundation !== foundation) archetype.Rebuild();
            // Do not discard a later pass's pending edits if an earlier apply fails.
            for (const plan of plans) if (this._applied.get(plan.pass) !== plan.state)
            {
                this._applied.delete(plan.pass);
                for (const name of plan.names) definition[name].Rebuild();
            }
            throw error;
        }
        finally { this._applying = false; }
        return foundationPending || changedPasses !== 0;
    }

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

}
