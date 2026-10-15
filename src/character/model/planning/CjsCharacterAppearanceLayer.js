import { meta, type, blue } from "#schema";

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

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterAppearanceSelection")
    owner = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterResolvedPart")
    contributor = null;

    /** Authored contribution weight when the dependency carries one. */
    @blue.readwrite
    @blue.persist
    @type.float64
    weight = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
