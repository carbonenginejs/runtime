import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One ordered logical operation in a character texture-composition target. */
@type.define({ className: "CjsCharacterCompositionPass", family: "character" })
export class CjsCharacterCompositionPass extends CjsModel
{

    @io.readwrite
    @type.model("CjsCharacterAppearanceLayer")
    layer = null;

    @io.readwrite
    @type.string
    op = "";

    @io.readwrite
    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @io.readwrite
    @type.model("CjsCharacterCoverage")
    coverage = null;

    @io.readwrite
    @type.vec4
    destination = null;

    @io.readwrite
    @type.string
    blend = "replace";

    @io.readwrite
    @type.string
    write = "rgba";

    @io.readwrite
    @type.float64
    strength = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
