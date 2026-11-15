import { meta, type } from "#schema";

// Discovery: src/character/discovery/face.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*.face

/**
 * One joint of a face mapping (`CjsCharacterFaceMapping.value`). The file writes one of two tuples under the joint's
 * key: `[joint, index, axis, value]`, or, for a pair of joints, `[joint, pairedJoint, index, four numbers]`. No source
 * names the tuple's slots; the member names are read off the values.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFaceMappingEntry")
export class CjsCharacterFaceMappingEntry
{

    /** The joint's key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The tuple's joint (slot 0). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    joint = "";

    /** The paired joint (slot 1 of the seven-slot tuple), or "" for the four-slot tuple. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    pairedJoint = "";

    /** The tuple's whole number (slot 1 of the four-slot tuple, slot 2 of the seven-slot one). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    index = 0;

    /** The axis (`x`, `y`, `z`; slot 2 of the four-slot tuple), or "" for the seven-slot tuple. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    axis = "";

    /** The tuple's trailing numbers, in order: one for the four-slot tuple, four for the seven-slot one. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    values = [];

}
