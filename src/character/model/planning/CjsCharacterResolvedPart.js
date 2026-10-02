import { meta } from "#schema";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@meta.define({ className: "CjsCharacterResolvedPart", family: "character" })
export class CjsCharacterResolvedPart
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    configurationPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    geometryPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    texturePaths = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    requestedLod = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    resolvedLod = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modelFamily = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
