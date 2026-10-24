import { meta, type } from "#schema";
import { CjsPaperDollEyes } from "./CjsPaperDollEyes.js";
import { CjsPaperDollEyebrows } from "./CjsPaperDollEyebrows.js";
import { CjsPaperDollBlush } from "./CjsPaperDollBlush.js";

/**
 * Application-owned appearance coordinator for eyes and shared head layers.
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

    _dirty = true;
    _headDirty = true;
    _appliedEyes = null;
    _appliedHead = null;
    _applying = false;

    /** Forces both prepared bindings to run on the next Update. */
    Rebuild()
    {
        this._dirty = true;
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
     * Collects edits once, then applies eyes and the combined head binding.
     * Successful groups are acknowledged independently; failed groups retry.
     * Edits made during either callback remain dirty for the following pass.
     * @param {{eyes: Function, head: Function}} bindings Prepared synchronous bindings.
     * @returns {boolean} Whether any output was rebuilt.
     */
    Update(bindings)
    {
        if (this._applying) return false;
        const eyesPending = this._dirty || this.eyes.IsDirty();
        const headPending = this._dirty || this._headDirty || this.eyebrows.IsDirty() || this.blush.IsDirty();
        if (!eyesPending && !headPending) return false;

        const eyes = this._Capture(this.eyes);
        const head = { eyebrows: this._Capture(this.eyebrows), blush: this._Capture(this.blush) };
        head.blush.weight = head.blush.option ? this.blush.weight : 0;
        const eyesChanged = eyesPending && (this._dirty || this._Changed(eyes, this._appliedEyes));
        const headChanged = headPending && (this._dirty || this._headDirty || !this._appliedHead
            || this._Changed(head.eyebrows, this._appliedHead.eyebrows)
            || this._Changed(head.blush, this._appliedHead.blush)
            || head.blush.weight !== this._appliedHead.blush.weight);

        this._dirty = false;
        this._headDirty = false;
        this.eyes.ClearDirty(); this.eyebrows.ClearDirty(); this.blush.ClearDirty();
        this._applying = true;
        try
        {
            if (eyesChanged) bindings.eyes(eyes);
            this._appliedEyes = eyes;
            if (headChanged) bindings.head(head);
            this._appliedHead = head;
        }
        catch (error)
        {
            // Do not discard a later group's pending edits if an earlier apply fails.
            if (this._appliedEyes !== eyes) { this._appliedEyes = null; this.eyes.Rebuild(); }
            if (this._appliedHead !== head) { this._appliedHead = null; this.eyebrows.Rebuild(); this.blush.Rebuild(); }
            throw error;
        }
        finally { this._applying = false; }
        return eyesChanged || headChanged;
    }
}
