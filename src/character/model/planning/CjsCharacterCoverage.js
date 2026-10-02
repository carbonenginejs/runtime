import { meta } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@meta.define({ className: "CjsCharacterCoverage", family: "character" })
export class CjsCharacterCoverage
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    region = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterTextureChannel")
    source = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterTextureChannel")
    subtract = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    combine = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
