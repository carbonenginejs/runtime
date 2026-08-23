import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Reusable appearance coverage expression shared across logical composition passes. */
@type.define({ className: "CjsCharacterCoverage", family: "character" })
export class CjsCharacterCoverage extends CjsModel
{

    @io.readwrite
    @type.string
    region = "";

    @io.readwrite
    @type.model("CjsCharacterTextureChannel")
    source = null;

    @io.readwrite
    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @io.readwrite
    @type.string
    combine = "";

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
