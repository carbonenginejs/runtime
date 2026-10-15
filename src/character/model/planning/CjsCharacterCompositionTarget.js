import { meta, type } from "#schema";

/**
 * Logical output texture and its authoritative ordered composition passes.
 *
 * Array position in `passes` is the pass order; there is no separate
 * sequence number. Selection-group order, `plan.layers` order and target
 * order are independent of it, and the order does not serialize the
 * renderer's own resource/shader transaction.
 */
@meta.define("CjsCharacterCompositionTarget")
export class CjsCharacterCompositionTarget
{

    @meta.readwrite
    @meta.persist
    @type.string
    scope = "";

    @meta.readwrite
    @meta.persist
    @type.string
    region = "";

    @meta.readwrite
    @meta.persist
    @type.string
    output = "";

    @meta.readwrite
    @meta.persist
    @type.vec2
    size = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
