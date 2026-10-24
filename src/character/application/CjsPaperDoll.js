import { CjsPaperDollSkin } from "./CjsPaperDollSkin.js";
import { meta, type } from "#schema";
import { CjsPaperDollArchetype } from "./CjsPaperDollArchetype.js";
import { CjsPaperDollEyes } from "./CjsPaperDollEyes.js";
import { CjsPaperDollEyebrows } from "./CjsPaperDollEyebrows.js";
import { CjsPaperDollBlush } from "./CjsPaperDollBlush.js";

/**
 * Application-owned foundation and appearance coordinator.
 * Prepared synchronous bindings run outside a render pass. The head binding
 * composes eyebrows and blush together in authored order; components own no
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
        this.eyes.Rebuild(); this.eyebrows.Rebuild(); this.blush.Rebuild();
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
     * @param {{foundation: Function, skin: Function, eyes: Function, head: Function}} bindings Prepared synchronous bindings.
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
        const eyesPending = foundationChanged || this._dirty || this.eyes.IsDirty();
        const headPending = skinChanged || foundationChanged || this._dirty || this._headDirty || this.eyebrows.IsDirty() || this.blush.IsDirty();
        if (!foundationPending && !eyesPending && !headPending)
        {
            this.skin.ClearDirty();
            this._appliedSkin = skin;
            return false;
        }

        const eyes = this._Capture(this.eyes);
        const head = { eyebrows: this._Capture(this.eyebrows), blush: this._Capture(this.blush) };
        head.blush.weight = head.blush.option ? this.blush.weight : 0;
        const eyesChanged = eyesPending && (foundationChanged || this._dirty || this._Changed(eyes, this._appliedEyes));
        const headChanged = headPending && (skinChanged || foundationChanged || this._dirty || this._headDirty || !this._appliedHead
            || this._Changed(head.eyebrows, this._appliedHead.eyebrows)
            || this._Changed(head.blush, this._appliedHead.blush)
            || head.blush.weight !== this._appliedHead.blush.weight);

        this._dirty = false;
        this._headDirty = false;
        this.archetype.ClearDirty();
        this.skin.ClearDirty();
        this.eyes.ClearDirty(); this.eyebrows.ClearDirty(); this.blush.ClearDirty();
        this._applying = true;
        try
        {
            if (foundationPending) bindings.foundation(foundation);
            this._appliedFoundation = foundation;
            if (skinChanged) bindings.skin(skin);
            this._appliedSkin = skin;
            if (eyesChanged) bindings.eyes(eyes);
            this._appliedEyes = eyes;
            if (headChanged) bindings.head(head);
            this._appliedHead = head;
        }
        catch (error)
        {
            if (foundationPending && this._appliedFoundation !== foundation) this.archetype.Rebuild();
            if (this._appliedSkin !== skin) { this._appliedSkin = null; this.skin.Rebuild(); }
            // Do not discard a later group's pending edits if an earlier apply fails.
            if (this._appliedEyes !== eyes) { this._appliedEyes = null; this.eyes.Rebuild(); }
            if (this._appliedHead !== head) { this._appliedHead = null; this.eyebrows.Rebuild(); this.blush.Rebuild(); }
            throw error;
        }
        finally { this._applying = false; }
        return foundationPending || eyesChanged || headChanged;
    }
}
