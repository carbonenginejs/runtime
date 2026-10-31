import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@meta.define("CjsCharacterCoverage")
export class CjsCharacterCoverage
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    region = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterTextureChannel")
    source = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    combine = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
