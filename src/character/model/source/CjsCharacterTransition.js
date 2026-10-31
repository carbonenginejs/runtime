import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_movementstates.yaml
// Resource pattern: res:/animation/*

/**
 * One transition in a movement static state.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterTransition")
export class CjsCharacterTransition
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    blendTime = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    maxInterruptPercent = 0;

    /** Authored state name; resolved separately. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    fromState = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    targetRotation = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    tolerance = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    executeRotation = 0;

}
