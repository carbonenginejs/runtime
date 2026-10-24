import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";
import { CjsPaperDollBlushItem } from "./CjsPaperDollBlushItem.js";

/** Application-owned blush settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollBlush")
export class CjsPaperDollBlush extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.BLUSH;
    static passes = PaperDollPass.HEAD;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem], ["1", CjsPaperDollBlushItem]]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Blush")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Style")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }

    _weight = 1;
    _defaultWeight = 1;

    @meta.property()
    @type.float32
    @meta.ui.description("Opacity")
    get weight() { return this._weight; }
    set weight(value)
    {
        if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Blush amount must be between zero and one");
        value = Math.fround(value);
        if (value !== this._weight) { this._weight = value; this.Rebuild(); }
    }

    /** Installs prepared options and the authored reset amount. */
    Configure(options, palettes, { option = "", weight = 1 } = {})
    {
        if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new RangeError("Invalid default blush amount");
        super.Configure(options, palettes, { option });
        this._defaultWeight = Math.fround(weight);
        this.weight = weight;
    }

    /** The captured selection plus its amount, zero while no blush is selected. */
    Capture(pass)
    {
        const state = super.Capture(pass);
        state.weight = state.option ? this.weight : 0;
        return state;
    }

    /** Restores the authored option, palette and amount. */
    Reset() { super.Reset(); this.weight = this._defaultWeight; }
}
