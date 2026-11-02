import { meta, type } from "#schema";

/** Qualified semantic texture channel from one exact source inventory. */
@meta.define("CjsCharacterCatalogTextureBinding")
export class CjsCharacterCatalogTextureBinding
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    path = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    role = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    target = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    quality = "";

    /** The resource version of the source version this binding was qualified from; "" is the baseline, unversioned source. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sourceVersion = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
