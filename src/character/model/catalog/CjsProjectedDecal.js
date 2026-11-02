import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Authored character projection profile with external texture references.
 * The name is observed as the YAML tag `paperDoll.ProjectedDecal` in .proj content.
 *
 * The collection is optional and may be empty even when the decoded source
 * values exist in `characterDefinitions`. The appearance resolver does not
 * read it; a consumer that needs a profile-to-part join must diagnose a
 * missing one rather than assume the catalog is populated.
 */
@meta.define({ className: "CjsProjectedDecal", aliases: [ "paperDoll.ProjectedDecal", "eve.client.script.paperDoll.projectedDecals.ProjectedDecal" ] })
export class CjsProjectedDecal extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    sourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    label = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    mode = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    angleRotation = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    aspectRatio = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    azimuth = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    texturePath = "";

    /** The content census contains only null; the non-null resource type is unresolved. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    textureResource = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    maskPath = "";

    /** The content census contains only null; the non-null resource type is unresolved. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    maskResource = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    headEnabled = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    bodyEnabled = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    flipx = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    flipy = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    height = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    incline = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    layer = 0;

    /**
     * Optional scene-recipe spelling, preserved separately from layer when authored. Layer indices start at 0, so
     * -1 means the scene recipe did not author it.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    layeres = -1;


    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    maskPathEnabled = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    offsetx = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    offsety = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    pitch = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    planarBeta = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    planarScale = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    posx = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    posy = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    posz = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    radius = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    roll = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    scale = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    yaw = 0;

}

export default CjsProjectedDecal;
