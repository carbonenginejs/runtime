import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@meta.define("CjsCharacterAppearanceDiagnostic")
export class CjsCharacterAppearanceDiagnostic
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    code = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    message = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    severity = "warning";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
