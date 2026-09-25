import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Logical output texture and its authoritative ordered composition passes.
 *
 * Array position in `passes` is the pass order; there is no separate
 * sequence number. Selection-group order, `plan.layers` order and target
 * order are independent of it, and the order does not serialize the
 * renderer's own resource/shader transaction.
 */
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
