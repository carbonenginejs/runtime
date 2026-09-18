import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Reusable appearance coverage expression shared across logical composition passes. */
@type.define({ className: "CjsCharacterCoverage", family: "character" })
export class CjsCharacterCoverage extends CjsModel
{

    @edit.readwrite
    @type.string
    region = "";

    @edit.readwrite
    @type.model("CjsCharacterTextureChannel")
    source = null;

    @edit.readwrite
    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @edit.readwrite
    @type.string
    combine = "";

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
