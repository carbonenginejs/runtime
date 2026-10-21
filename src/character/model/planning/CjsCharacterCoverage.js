import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Reusable appearance coverage expression shared across logical composition passes. */
@meta.define("CjsCharacterCoverage")
export class CjsCharacterCoverage
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    region = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterTextureChannel")
    source = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterTextureChannel")
    subtract = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    combine = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterCoverage;
