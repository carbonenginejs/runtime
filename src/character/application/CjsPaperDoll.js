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

/**
 * Application-owned foundation and appearance coordinator.
 * Prepared synchronous bindings run outside a render pass. The head binding
 * composes shared diffuse contributors; the surface binding owns normal and
 * specular contributors. Components own no
 * effects. This bounded integration is not a general dependency scheduler.
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

    _appliedSurface = null;
    _appliedSkin = null;
    _appliedFoundation = null;
    _dirty = true;
    _headDirty = true;
    _appliedEyes = null;
    _appliedHead = null;
    _applying = false;

    /** Forces the selected foundation and both modifier bindings on the next Update. */
    Rebuild()
    {
        this._dirty = true;
        this.archetype.Rebuild();
        this.skin.Rebuild();
        this.freckles.Rebuild();
        this.aging.Rebuild(); this.scarring.Rebuild(); this.scars.Rebuild();
        this.eyes.Rebuild(); this.eyebrows.Rebuild(); this.blush.Rebuild();
        this.tattoo.Rebuild();
    }

    /** Invalidates the shared output when a prepared external layer changes. */
    RebuildHead() { this._headDirty = true; }

    /** Captures owned typed values before any binding can edit the settings. */
    _Capture(component)
    {
        const option = component.enabled ? component.option : "";
        return { option, colors: component.GetColors().map(value => Float32Array.from(value)), colorAreas: option ? [...component.GetColorAreas()] : [] };
    }

    /** Compares only fields which can affect the selected component's output. */
    _Changed(state, previous)
    {
        return !previous || previous.option !== state.option
            || state.colorAreas.length !== previous.colorAreas.length
            || state.colorAreas.some((area, index) => area !== previous.colorAreas[index]
                || state.colors[area - 1].some((value, channel) => value !== previous.colors[area - 1][channel]));
    }

    /**
     * Collects edits once, then applies foundation, skin, eyes and the combined head binding.
     * Successful groups are acknowledged independently; failed groups retry.
     * Edits made during either callback remain dirty for the following pass.
     * @param {{foundation: Function, skin: Function, surface: Function, eyes: Function, head: Function}} bindings Prepared synchronous bindings.
     * @returns {boolean} Whether any output was rebuilt.
     */
    Update(bindings)
    {
        if (this._applying) return false;
        const foundationPending = this.archetype.IsDirty();
        const foundation = foundationPending ? this.archetype.Resolve() : this._appliedFoundation;
        // A geometry-only strength edit must not rebuild skin or cosmetic maps.
        const foundationChanged = this.archetype.IsFoundationDirty();
        const skinPending = foundationChanged || this._dirty || this.skin.IsDirty() || !this._appliedSkin;
        const skin = skinPending ? this._Capture(this.skin) : this._appliedSkin;
        const skinChanged = Boolean(skinPending && (skin.option || this._appliedSkin?.option)
            && (foundationChanged || this._dirty || this._Changed(skin, this._appliedSkin)));
        const surfacePending = foundationChanged || this._dirty || this.aging.IsDirty() || this.scarring.IsDirty() || this.scars.IsDirty() || !this._appliedSurface;
        const surface = surfacePending ? { scars: this._Capture(this.scars), aging: this._Capture(this.aging), scarring: this._Capture(this.scarring) } : this._appliedSurface;
        const surfaceActive = surface.scars.option || surface.aging.option || surface.scarring.option || this._appliedSurface?.scars.option || this._appliedSurface?.aging.option || this._appliedSurface?.scarring.option;
        const surfaceChanged = Boolean(surfacePending && surfaceActive && (foundationChanged || this._dirty || !this._appliedSurface
            || this._Changed(surface.scars, this._appliedSurface.scars) || this._Changed(surface.aging, this._appliedSurface.aging) || this._Changed(surface.scarring, this._appliedSurface.scarring)));
        const eyesPending = foundationChanged || this._dirty || this.eyes.IsDirty();
        // A tattoo is baked from the morphed face, so any foundation edit (strength included) rebakes it.
        const tattooShape = foundationPending && this.tattoo.enabled && this.tattoo.option !== "";
        const headPending = skinChanged || foundationChanged || tattooShape || this._dirty || this._headDirty || this.eyebrows.IsDirty() || this.blush.IsDirty() || this.freckles.IsDirty() || this.scars.IsDirty() || this.tattoo.IsDirty();
        if (!foundationPending && !eyesPending && !headPending && !surfaceChanged)
        {
            this.skin.ClearDirty();
            this._appliedSkin = skin;
            this.aging.ClearDirty(); this.scarring.ClearDirty(); this._appliedSurface = surface;
            return false;
        }

        const eyes = this._Capture(this.eyes);
        const head = { scars: this._Capture(this.scars), freckles: this._Capture(this.freckles), eyebrows: this._Capture(this.eyebrows), blush: this._Capture(this.blush), tattoo: this._Capture(this.tattoo) };
        head.blush.weight = head.blush.option ? this.blush.weight : 0;
        const eyesChanged = eyesPending && (foundationChanged || this._dirty || this._Changed(eyes, this._appliedEyes));
        const headChanged = headPending && (skinChanged || foundationChanged || tattooShape || this._dirty || this._headDirty || !this._appliedHead
            || this._Changed(head.eyebrows, this._appliedHead.eyebrows)
            || this._Changed(head.blush, this._appliedHead.blush)
            || this._Changed(head.scars, this._appliedHead.scars)
            || this._Changed(head.freckles, this._appliedHead.freckles)
            || this._Changed(head.tattoo, this._appliedHead.tattoo)
            || head.blush.weight !== this._appliedHead.blush.weight);

        this._dirty = false;
        this._headDirty = false;
        this.archetype.ClearDirty();
        this.skin.ClearDirty();
        this.freckles.ClearDirty(); this.scars.ClearDirty(); this.tattoo.ClearDirty();
        this.aging.ClearDirty(); this.scarring.ClearDirty();
        this.eyes.ClearDirty(); this.eyebrows.ClearDirty(); this.blush.ClearDirty();
        this._applying = true;
        try
        {
            if (foundationPending) bindings.foundation(foundation);
            this._appliedFoundation = foundation;
            if (skinChanged) bindings.skin(skin);
            this._appliedSkin = skin;
            if (surfaceChanged) bindings.surface(surface);
            this._appliedSurface = surface;
            if (eyesChanged) bindings.eyes(eyes);
            this._appliedEyes = eyes;
            if (headChanged) bindings.head(head);
            this._appliedHead = head;
        }
        catch (error)
        {
            if (foundationPending && this._appliedFoundation !== foundation) this.archetype.Rebuild();
            if (this._appliedSkin !== skin) { this._appliedSkin = null; this.skin.Rebuild(); }
            if (this._appliedSurface !== surface) { this._appliedSurface = null; this.aging.Rebuild(); this.scarring.Rebuild(); }
            // Do not discard a later group's pending edits if an earlier apply fails.
            if (this._appliedEyes !== eyes) { this._appliedEyes = null; this.eyes.Rebuild(); }
            if (this._appliedHead !== head) { this._appliedHead = null; this.eyebrows.Rebuild(); this.blush.Rebuild(); this.freckles.Rebuild(); this.scars.Rebuild(); this.tattoo.Rebuild(); }
            throw error;
        }
        finally { this._applying = false; }
        return foundationPending || surfaceChanged || eyesChanged || headChanged;
    }
}
