import { exposure as be } from "#be";
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

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    scope = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    region = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    output = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    size = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterCompositionPass")
    passes = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCompositionTarget;
