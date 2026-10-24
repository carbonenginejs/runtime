import { meta, type } from "#schema";
import { CjsPaperDollEyes } from "./CjsPaperDollEyes.js";

/**
 * Application-owned appearance update coordinator; initial eyes integration.
 * Resource preparation belongs to the binding, before it is supplied here.
 * Update is synchronous and called outside an active render pass. The binding
 * builds inactive targets and publishes completed bindings before returning.
 * This is not a general dependency scheduler or a native Carbon Doll port.
 */
@meta.define("CjsPaperDoll")
export class CjsPaperDoll
{
    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyes")
    eyes = new CjsPaperDollEyes();

    _dirty = true;
    _appliedEyes = null;
    _applying = false;

    /** Forces the current eye bindings to be regenerated on the next Update. */
    Rebuild() { this._dirty = true; this.eyes.Rebuild(); }

    /**
     * Coalesces eye edits and applies only effective changes. Returns whether
     * the prepared binding ran. Failed applies remain dirty and retryable.
     * @param {Function} applyEyes Synchronous prepared-material binding.
     * @returns {boolean} Whether an eye binding was applied.
     */
    Update(applyEyes)
    {
        const eyes = this.eyes;
        if (this._applying) return false;
        if (!this._dirty && !eyes.IsDirty()) return false;
        const option = eyes.enabled ? eyes.option : "";
        const state = { option, colors: eyes.GetColors().map(value => Float32Array.from(value)), colorAreas: option ? [...eyes.GetColorAreas()] : [] };
        const previous = this._appliedEyes;
        const changed = this._dirty || !previous || previous.option !== state.option
            || state.colorAreas.some(area => state.colors[area - 1].some((value, index) => value !== previous.colors[area - 1][index]));
        this._dirty = false; eyes.ClearDirty();
        this._applying = true;
        try { if (changed) applyEyes(state); }
        catch (error) { this._dirty = true; eyes.Rebuild(); throw error; }
        finally { this._applying = false; }
        this._appliedEyes = state;
        return changed;
    }
}
