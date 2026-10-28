import { meta, type } from "#schema";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * One authored material-info record, without Carbon parameter objects.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMaterial")
export class CjsCharacterMaterial
{

    /** Authored material attribute record. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterAttributes")
    Attributes = null;

    /** Only an empty map is evidenced; no texture entry shape is invented. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map("unknown")
    Textures = new Map();

}
