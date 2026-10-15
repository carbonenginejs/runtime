import { meta, type, blue } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@meta.define("CjsCharacterAppearanceDiagnostic")
export class CjsCharacterAppearanceDiagnostic
{

    @blue.readwrite
    @blue.persist
    @type.string
    code = "";

    @blue.readwrite
    @blue.persist
    @type.string
    message = "";

    @blue.readwrite
    @blue.persist
    @type.string
    severity = "warning";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
