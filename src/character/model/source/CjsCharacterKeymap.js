import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_movementstates.yaml
// Resource pattern: res:/animation/*

/**
 * One input-to-state mapping.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterKeymap")
export class CjsCharacterKeymap
{

    /** Three authored integer input components. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("int32")
    input = [];

    /** Authored state name, resolved separately. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    state = "";

}
