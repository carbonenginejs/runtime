import { meta, type, blue } from "#schema";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@meta.define("CjsCharacterResolvedPart")
export class CjsCharacterResolvedPart
{

    @blue.readwrite
    @blue.persist
    @type.path
    configurationPath = null;

    @blue.readwrite
    @blue.persist
    @type.path
    geometryPath = null;

    @blue.readwrite
    @blue.persist
    @type.list("string")
    texturePaths = [];

    @blue.readwrite
    @blue.persist
    @type.int32
    requestedLod = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    resolvedLod = null;

    @blue.readwrite
    @blue.persist
    @type.string
    modelFamily = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
