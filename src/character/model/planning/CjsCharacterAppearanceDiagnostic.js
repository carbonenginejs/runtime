import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Serializable diagnostic emitted while resolving a character appearance plan. */
@meta.define("CjsCharacterAppearanceDiagnostic")
export class CjsCharacterAppearanceDiagnostic
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    code = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    message = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    severity = "warning";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceDiagnostic;
