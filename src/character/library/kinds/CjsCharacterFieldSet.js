import { meta, type } from "#schema";

// Discovery: src/character/discovery/trif.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * A source of named sculpt fields, retaining the authored Fields key.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFieldSet")
export class CjsCharacterFieldSet
{

    /** Authored field identifiers and records. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.map({ kind: "rootRef", className: "CjsCharacterField" })
    Fields = new Map();

}
