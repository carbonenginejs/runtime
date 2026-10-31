import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Logical alpha policy for one final character texture binding. */
@meta.define("CjsCharacterBindingAlpha")
export class CjsCharacterBindingAlpha
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    mode = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
