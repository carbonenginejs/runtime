import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One ordered logical operation in a character texture-composition target. */
@type.define({ className: "CjsCharacterCompositionPass", family: "character" })
export class CjsCharacterCompositionPass extends CjsModel
{

    @edit.readwrite
    @type.model("CjsCharacterAppearanceLayer")
    layer = null;

    @edit.readwrite
    @type.string
    op = "";

    @edit.readwrite
    @type.list("CjsCharacterCompositionInput")
    inputs = [];

    @edit.readwrite
    @type.model("CjsCharacterCoverage")
    coverage = null;

    @edit.readwrite
    @type.vec4
    destination = null;

    @edit.readwrite
    @type.string
    blend = "replace";

    @edit.readwrite
    @type.string
    write = "rgba";

    @edit.readwrite
    @type.float64
    strength = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionPass;
