import { meta, type } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@meta.define("CjsCharacterAppearanceDiagnostic")
export class CjsCharacterAppearanceDiagnostic
{

    @meta.readwrite
    @meta.persist
    @type.string
    code = "";

    @meta.readwrite
    @meta.persist
    @type.string
    message = "";

    @meta.readwrite
    @meta.persist
    @type.string
    severity = "warning";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
