import { exposure as be } from "#be";
import { meta, type } from "#schema";

/**
 * Appearance contribution separating selection ownership from the asset that supplies it.
 *
 * A dependency can be owned by one selection while another source supplies
 * its mesh, material or visible alpha. `plan.layers` order is inventory
 * order, not bake order.
 */
@meta.define("CjsCharacterAppearanceLayer")
export class CjsCharacterAppearanceLayer
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterResolvedPart")
    contributor = null;

    /** Authored contribution weight when the dependency carries one. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
