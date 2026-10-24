import { meta } from "#schema";

/** Base item configuration with no editable colour properties. */
@meta.define("CjsPaperDollItem")
export class CjsPaperDollItem
{
    _owner = null;
    _palette = "";
    _customColors = false;
    _colors = Array.from({ length: 3 }, () => Float32Array.of(.5, .5, .5, 1));
    /** Borrows the slot's remembered settings; owns no effects or resources. */
    constructor(owner = null) { this._owner = owner; }

    /** Standalone instances have independent neutral defaults for reflection. */
    _GetColor(index) { return this._owner ? this._owner.GetColors()[index] : this._colors[index]; }

    /** Edits an attached slot, or independent standalone configuration data. */
    _SetColor(index, value)
    {
        if (this._owner) this._owner.SetColor(index, value);
        else { this._colors[index].set(CjsPaperDollItem.copyColor(value)); this._customColors = true; }
    }

    /** Copies finite typed RGBA without modifying input storage. */
    static copyColor(value)
    {
        if (value.length !== 4 || !Array.from(value).every(Number.isFinite)) throw new TypeError("Expected four finite colour components");
        const result = Float32Array.from(value);
        if (!result.every(Number.isFinite)) throw new RangeError("Colour exceeds float32 storage");
        return result;
    }
}
