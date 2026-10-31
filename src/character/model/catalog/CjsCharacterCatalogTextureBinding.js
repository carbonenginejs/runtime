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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sourceVersion = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
