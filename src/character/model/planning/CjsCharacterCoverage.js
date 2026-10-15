import { meta, type } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@meta.define("CjsCharacterCoverage")
export class CjsCharacterCoverage
{

    @meta.readwrite
    @meta.persist
    @type.string
    region = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterTextureChannel")
    source = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @meta.readwrite
    @meta.persist
    @type.string
    combine = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
