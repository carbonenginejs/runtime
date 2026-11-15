import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_movementstates.yaml
// Resource pattern: res:/animation/*

/**
 * One input-to-state mapping. Its default input [ 0, 0, 0 ] is a storage default, not an inferred authored one.
 */
@meta.define("CjsCharacterKeymap")
export class CjsCharacterKeymap
{

    /** Three authored integer input components (each -1, 0 or 1). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32Array(3)
    input = new Int32Array(3); // alloc: field default, one per record

    /** Authored state name, resolved separately. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    state = "";

}
