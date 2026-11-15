import { meta, type } from "#schema";
import "./CjsCharacterDataMirrorRegion.js";

/**
 * One mesh a morph correction covers (`CjsCharacterMorphCorrections.offsetsFor`): either mirrored in its regions, or
 * carried, taking the smoothed change of the mirrored mesh it rides.
 *
 * Ours (no Carbon counterpart): Carbon applies shipped morph data as it is.
 */
@meta.define("CjsCharacterDataMorphCorrectionMesh")
export class CjsCharacterDataMorphCorrectionMesh
{

    /** The mesh's name in the model (`meshShape`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The mirrored mesh of the same correction this one rides; empty: this mesh is mirrored in `mirror`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    carry = "";

    /** The regions in which the mesh is mirrored; empty for a carried mesh. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataMirrorRegion")
    mirror = [];

}
