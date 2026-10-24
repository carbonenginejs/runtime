import { meta, type } from "#schema";

/** Qualified semantic texture channel from one exact source inventory. */
@meta.define("CjsCharacterCatalogTextureBinding")
export class CjsCharacterCatalogTextureBinding
{
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.path
    path = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    role = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    target = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    quality = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sourceVersion = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}
