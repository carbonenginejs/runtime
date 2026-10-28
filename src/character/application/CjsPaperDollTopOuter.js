import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned topouter garment (`topouter`) settings: the
 * garment, its palette and custom colours. The garment's maps are body-atlas
 * maps: its colourised diffuse bakes into the body pass, and its normal
 * (replacing the normals under it inside its coverage) and specular into the
 * surface pass. It also has its own mesh, which the host draws with the
 * composed body maps.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected garment's zone map uses them.
 */
@meta.define("CjsPaperDollTopOuter")
export class CjsPaperDollTopOuter extends CjsPaperDollComponent
{

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Over top")
    enabled = true;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Palette")
    palette = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Custom colours")
    customColors = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Secondary colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Third colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    static layer = PaperDollLayer.TOPOUTER;

    static passes = PaperDollPass.BODY | PaperDollPass.SURFACE;

    static category = "topouter";

    static optionNamesPalette = true;

}
