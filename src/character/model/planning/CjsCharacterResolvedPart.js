import { meta, type } from "#schema";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@meta.define("CjsCharacterResolvedPart")
export class CjsCharacterResolvedPart
{

    @meta.readwrite
    @meta.persist
    @type.path
    configurationPath = null;

    @meta.readwrite
    @meta.persist
    @type.path
    geometryPath = null;

    @meta.readwrite
    @meta.persist
    @type.list("string")
    texturePaths = [];

    @meta.readwrite
    @meta.persist
    @type.int32
    requestedLod = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    resolvedLod = null;

    @meta.readwrite
    @meta.persist
    @type.string
    modelFamily = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
