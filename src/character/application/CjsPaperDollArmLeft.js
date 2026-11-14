import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollPalettes, PaperDollTarget } from "./paperDollOrder.js";

/**
 * Application-owned left arm augmentation settings: one authored type (a variation and
 * colour variant), its palette and custom colours. It bakes onto the body like
 * underwear: its diffuse into the body pass, and its normal (replacing the
 * normals under it inside its coverage) and specular into the surface pass.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected garment's zone map uses them.
 */
@meta.define("CjsPaperDollArmLeft")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollArmLeft extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Left arm augmentation")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Palette")
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

    static layer = PaperDollLayer.ARMLEFT;

    static targets = PaperDollTarget.BODY | PaperDollTarget.SURFACE;

    static blend = PaperDollBlend.MATERIAL;

    /** Where its palette files live: each option's own folder (`PaperDollPalettes`). */
    static palettes = PaperDollPalettes.OWN;

    static optionNamesPalette = true;

}
