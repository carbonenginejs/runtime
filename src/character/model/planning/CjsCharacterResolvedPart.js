import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Plan-local source-version contributor with optional exact configuration and geometry choices. */
@meta.define("CjsCharacterResolvedPart")
export class CjsCharacterResolvedPart
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    configurationPath = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    geometryPath = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    texturePaths = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    requestedLod = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    resolvedLod = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    modelFamily = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterResolvedPart;
