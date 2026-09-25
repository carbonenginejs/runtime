import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Appearance contribution separating selection ownership from the asset that supplies it.
 *
 * A dependency can be owned by one selection while another source supplies
 * its mesh, material or visible alpha. `plan.layers` order is inventory
 * order, not bake order.
 */
@type.define({ className: "CjsCharacterAppearanceLayer", family: "character" })
export class CjsCharacterAppearanceLayer extends CjsModel
{

    @edit.readwrite
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @edit.readwrite
    @type.model("CjsCharacterResolvedPart")
    contributor = null;

    /** Authored contribution weight when the dependency carries one. */
    @edit.readwrite
    @type.float64
    weight = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
