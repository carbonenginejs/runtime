import { meta, type } from "#schema";

// Discovery: src/character/discovery/animation_movementstates.yaml
// Resource pattern: res:/animation/*

/**
 * One named static state in a movement-state record.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterStaticState")
export class CjsCharacterStaticState
{

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    speed = 0;

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    heading = [0, 0, 0];

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    rotSpeed = 0;

    /** Ordered authored transitions. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterTransition")
    transitions = [];

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    minSpeed = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    camOffset = 0;

}
