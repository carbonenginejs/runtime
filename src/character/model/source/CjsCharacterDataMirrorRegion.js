import { meta, type } from "#schema";
import { vec3 } from "#math/vec3";

/**
 * One region of a mirrored mesh in which a vertex's morph offset blends towards its mirror partner's, mirrored across
 * x (`CjsCharacterMorphCorrections.regionWeight`): a sphere (`center`, `inner`, `outer`), or the character's right
 * half (`right`: `inner` and `outer` from the midline, the character's right being -x).
 *
 * Ours (no Carbon counterpart): Carbon applies shipped morph data as it is.
 */
@meta.define("CjsCharacterDataMirrorRegion")
export class CjsCharacterDataMirrorRegion
{

    /** What the region covers (`right nostril`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Whether it is the character's right half, measured from the midline; else a sphere around `center`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    right = false;

    /** The sphere's centre, in metres; unused for the right half. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3
    center = vec3.create();

    /** The distance, in metres, inside which the offset is fully mirrored. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    inner = 0;

    /** The distance, in metres, beyond which the offset stays as shipped. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    outer = 0;

}
