import { meta, type } from "#schema";

/** Logical alpha policy for one final character texture binding. */
@meta.define("CjsCharacterBindingAlpha")
export class CjsCharacterBindingAlpha
{

    @meta.readwrite
    @meta.persist
    @type.string
    mode = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
