import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollTarget } from "./paperDollOrder.js";

/** Shared head/body skin palette, independent of foundation shape strength. */
@meta.define("CjsPaperDollSkin")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollSkin extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Skin colour")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Skin tone")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Custom colours")
    customColors = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Secondary colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Third colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    static layer = PaperDollLayer.SKINTONE;

    static targets = PaperDollTarget.SKIN;

    static blend = PaperDollBlend.COLORIZE;

}
