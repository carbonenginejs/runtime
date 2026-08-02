import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Plan-local part contributor with one atomic configuration and geometry choice. */
@type.define({ className: "CjsCharacterResolvedPart", family: "character" })
export class CjsCharacterResolvedPart extends CjsModel
{

    @io.readwrite
    @type.path
    configurationPath = null;

    @io.readwrite
    @type.path
    geometryPath = null;

    @io.readwrite
    @type.int32
    requestedLod = null;

    @io.readwrite
    @type.int32
    resolvedLod = null;

    @io.readwrite
    @type.string
    modelFamily = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
