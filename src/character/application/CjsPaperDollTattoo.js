import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned head tattoo settings: the projected profile, its ink
 * palette and custom ink colours. Edits invalidate the doll's head pass.
 *
 * The colour slots are this component's own properties; there are no
 * per-shape item classes. `GetControls` offers the palette and only the
 * slots the selected profile's zone map uses. Every head tattoo in build
 * 3646012 is zoned to colour area 1, the one qualified shape; other shapes
 * are refused until their zones are qualified.
 */
@meta.define("CjsPaperDollTattoo")
export class CjsPaperDollTattoo extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Tattoos")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Tattoo")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Tattoo ink")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Tattoo custom ink")
    customColors = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Ink colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Ink colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Ink colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    static layer = PaperDollLayer.TATTOO;

    static passes = PaperDollPass.HEAD;

    static category = "tattoo";

    static shapeDependent = true;

}
