import { meta, type, blue } from "#schema";

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

    @blue.readwrite
    @blue.persist
    @type.string
    scope = "";

    @blue.readwrite
    @blue.persist
    @type.string
    region = "";

    @blue.readwrite
    @blue.persist
    @type.string
    output = "";

    @blue.readwrite
    @blue.persist
    @type.vec2
    size = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
