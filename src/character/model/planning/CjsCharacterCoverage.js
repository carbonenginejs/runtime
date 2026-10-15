import { meta, type, blue } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@meta.define("CjsCharacterCoverage")
export class CjsCharacterCoverage
{

    @blue.readwrite
    @blue.persist
    @type.string
    region = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterTextureChannel")
    source = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @blue.readwrite
    @blue.persist
    @type.string
    combine = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
