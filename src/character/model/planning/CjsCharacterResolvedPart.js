import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@type.define({ className: "CjsCharacterResolvedPart", family: "character" })
export class CjsCharacterResolvedPart extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.path
    configurationPath = null;

    @edit.readwrite
    @edit.persist
    @type.path
    geometryPath = null;

    @edit.readwrite
    @edit.persist
    @type.list("string")
    texturePaths = [];

    @edit.readwrite
    @edit.persist
    @type.int32
    requestedLod = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    resolvedLod = null;

    @edit.readwrite
    @edit.persist
    @type.string
    modelFamily = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
