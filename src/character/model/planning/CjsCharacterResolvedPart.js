import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@type.define({ className: "CjsCharacterResolvedPart", family: "character" })
export class CjsCharacterResolvedPart extends CjsModel
{

    @edit.readwrite
    @type.path
    configurationPath = null;

    @edit.readwrite
    @type.path
    geometryPath = null;

    @edit.readwrite
    @type.list("string")
    texturePaths = [];

    @edit.readwrite
    @type.int32
    requestedLod = null;

    @edit.readwrite
    @type.int32
    resolvedLod = null;

    @edit.readwrite
    @type.string
    modelFamily = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
