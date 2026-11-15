import { meta, type } from "#schema";
import "./CjsCharacterDataParameterDouble.js";

// Discovery: src/character/discovery/animation_animinfo.yaml
// Resource pattern: res:/animation/*

/**
 * One named animation-info record with its authored field casing.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationInfoEntry")
export class CjsCharacterAnimationInfoEntry
{

    /** The animation name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    Category = "";

    /** Its control parameters, each named by its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameterDouble")
    ControlParameters = [];

    /** Authored string, retained without normalization of spelling. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    Request = "";

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    duration = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    startDistance = 0;

    /** Authored boolean value. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    synchronized = false;

    /** Authored integer value. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    id = 0;

}
