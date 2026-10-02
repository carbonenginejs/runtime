import { meta } from "#schema";

/**
 * Appearance contribution separating selection ownership from the asset that supplies it.
 *
 * A dependency can be owned by one selection while another source supplies
 * its mesh, material or visible alpha. `plan.layers` order is inventory
 * order, not bake order.
 */
@meta.define({ className: "CjsCharacterAppearanceLayer", family: "character" })
export class CjsCharacterAppearanceLayer
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterResolvedPart")
    contributor = null;

    /** Authored contribution weight when the dependency carries one. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weight = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
