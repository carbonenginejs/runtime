import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollPalettes, PaperDollTarget } from "./paperDollOrder.js";

/** Application-owned eyebrow settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollEyebrows")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollEyebrows extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Eyebrows")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Eyebrow palette")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Eyebrow custom colours")
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

    static layer = PaperDollLayer.EYEBROWS;

    static targets = PaperDollTarget.HEAD;

    static blend = PaperDollBlend.COLORIZE;

    /** Where its palette files live: the category's catalog (`PaperDollPalettes`). */
    static palettes = PaperDollPalettes.CATALOG;


    /**
     * Its option also dresses the brow carrier mesh: the option's normal and specular are that mesh's material, and its
     * colourised detail drawn unblended (with its coverage) is the carrier's colour (`CjsPaperDollColorizedSource`).
     */
    static carrier = true;

    /** Its paint draws at full strength: the eyebrows have no weight setting (`CjsPaperDollColorizedSource`). */
    static weighted = false;

}
