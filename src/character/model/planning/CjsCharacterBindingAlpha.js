import { meta, type, blue } from "#schema";

/** Logical alpha policy for one final character texture binding. */
@meta.define("CjsCharacterBindingAlpha")
export class CjsCharacterBindingAlpha
{

    @blue.readwrite
    @blue.persist
    @type.string
    mode = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
