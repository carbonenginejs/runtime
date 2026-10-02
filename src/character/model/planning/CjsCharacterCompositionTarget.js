import { meta } from "#schema";

/**
 * Logical output texture and its authoritative ordered composition passes.
 *
 * Array position in `passes` is the pass order; there is no separate
 * sequence number. Selection-group order, `plan.layers` order and target
 * order are independent of it, and the order does not serialize the
 * renderer's own resource/shader transaction.
 */
@meta.define({ className: "CjsCharacterCompositionTarget", family: "character" })
export class CjsCharacterCompositionTarget
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    scope = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    region = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    output = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec2
    size = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterCompositionPass")
    passes = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
