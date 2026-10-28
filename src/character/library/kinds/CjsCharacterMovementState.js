import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_movementstates.yaml
// Resource pattern: res:/animation/*

/**
 * One movement-state record containing static states and input mappings.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMovementState")
export class CjsCharacterMovementState
{

    /** Authored string, retained without normalization of spelling. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored boolean value. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    startsEnabled = false;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    baseSpeed = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    runningMod = 0;

    /** Ordered authored static states. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterStaticState")
    staticStates = [];

    /** Ordered authored input mappings. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterKeymap")
    keymaplist = [];

}
