import { edit, type } from "#schema";

/**
 * Appearance contribution separating selection ownership from the asset that supplies it.
 *
 * A dependency can be owned by one selection while another source supplies
 * its mesh, material or visible alpha. `plan.layers` order is inventory
 * order, not bake order.
 */
@type.define({ className: "CjsCharacterAppearanceLayer", family: "character" })
export class CjsCharacterAppearanceLayer
{

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterResolvedPart")
    contributor = null;

    /** Authored contribution weight when the dependency carries one. */
    @edit.readwrite
    @edit.persist
    @type.float64
    weight = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
