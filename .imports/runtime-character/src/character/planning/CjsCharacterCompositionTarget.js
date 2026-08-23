import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Logical output texture and its authoritative ordered composition passes. */
@type.define({ className: "CjsCharacterCompositionTarget", family: "character" })
export class CjsCharacterCompositionTarget extends CjsModel
{

    @io.readwrite
    @type.string
    scope = "";

    @io.readwrite
    @type.string
    region = "";

    @io.readwrite
    @type.string
    output = "";

    @io.readwrite
    @type.vec2
    size = null;

    @io.readwrite
    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
