import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/positions.yaml
// Additional discovery: scenes_position.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/positions/*

/**
 * Placement with authored translation and four-component rotation.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPosition")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterPosition extends CjsCharacterRecord
{

    /** The placement's rotation quaternion, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec4d
    rotation = new Float64Array(4);

    /** The placement's translation, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    translation = new Float64Array(3);

}
