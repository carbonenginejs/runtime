import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Logical output texture and its authoritative ordered composition passes. */
@type.define({ className: "CjsCharacterCompositionTarget", family: "character" })
export class CjsCharacterCompositionTarget extends CjsModel
{

    @edit.readwrite
    @type.string
    scope = "";

    @edit.readwrite
    @type.string
    region = "";

    @edit.readwrite
    @type.string
    output = "";

    @edit.readwrite
    @type.vec2
    size = null;

    @edit.readwrite
    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
