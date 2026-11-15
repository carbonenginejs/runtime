import { meta, type } from "#schema";
import { vec2 } from "#math/vec2";

/**
 * One dependant mesh the paper doll draws with its owner's diffuse (the drape; `CjsPaperDollInstance.meshDependantStates`).
 * The generic holds these in a list keyed by `path` (`CjsCharacterGeneric.meshDependants`); the shipped defaults are
 * `factory/defaults/generic.js`. Its areas take the setup the library resolves for its category
 * (`CjsCharacterLibraryManager.FetchModelAreas`).
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
@meta.define("CjsCharacterDataMeshDependant")
export class CjsCharacterDataMeshDependant
{

    /** The dependant's modifier path below the sex's paper doll root (`dependants/drape/standard`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    path = "";

    /** The definition member whose worn garment lists it (`topMiddle`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    owner = "";

    /** The owner's field naming the version to draw (`tuck`): 0 the folder's own model, n its `vN/` folder's. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    state = "";

    /** The size of the owner's diffuse it draws with, in pixels. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec2
    diffuseSize = vec2.create();

}
