import { edit, type } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@type.define({ className: "CjsCharacterCoverage", family: "character" })
export class CjsCharacterCoverage
{

    @edit.readwrite
    @edit.persist
    @type.string
    region = "";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterTextureChannel")
    source = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @edit.readwrite
    @edit.persist
    @type.string
    combine = "";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
