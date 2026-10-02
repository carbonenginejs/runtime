import { edit, type } from "#schema";

/**
 * Logical output texture and its authoritative ordered composition passes.
 *
 * Array position in `passes` is the pass order; there is no separate
 * sequence number. Selection-group order, `plan.layers` order and target
 * order are independent of it, and the order does not serialize the
 * renderer's own resource/shader transaction.
 */
@type.define({ className: "CjsCharacterCompositionTarget", family: "character" })
export class CjsCharacterCompositionTarget
{

    @edit.readwrite
    @edit.persist
    @type.string
    scope = "";

    @edit.readwrite
    @edit.persist
    @type.string
    region = "";

    @edit.readwrite
    @edit.persist
    @type.string
    output = "";

    @edit.readwrite
    @edit.persist
    @type.vec2
    size = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
