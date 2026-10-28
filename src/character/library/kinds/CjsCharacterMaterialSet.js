import { meta, type } from "#schema";

// Discovery: src/character/discovery/info.yaml
// Resource pattern: res:/graphics/character/*

/**
 * A material-info source containing named records, not rendered material instances.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMaterialSet")
export class CjsCharacterMaterialSet
{

    /** Authored material identifiers and their records. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "rootRef", className: "CjsCharacterMaterial" })
    Materials = new Map();

}
