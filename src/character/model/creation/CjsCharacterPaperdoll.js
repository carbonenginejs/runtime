import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
@meta.define("CjsCharacterPaperdoll")
export class CjsCharacterPaperdoll extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browLeftCurl = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browLeftTighten = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browLeftUpDown = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browRightCurl = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browRightTighten = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    browRightUpDown = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraFieldOfView = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraPoiX = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraPoiY = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraPoiZ = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraX = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraY = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    cameraZ = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterColorSelection")
    colorSelections = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    creationDate = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    eyeClose = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    eyesLookHorizontal = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    eyesLookVertical = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    frownLeft = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    frownRight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    hairDarkness = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    headLookTargetX = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    headLookTargetY = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    headLookTargetZ = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    headTilt = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    jawSideways = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    jawUp = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lastRendered = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lastUpdate = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    lightIntensity = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterModifierSelection")
    modifiers = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    orientChar = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    portraitPoseNumber = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    puckerLips = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterSculptSelection")
    sculptWeights = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    smileLeft = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    smileRight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    squintLeft = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    squintRight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterPortraitResource")
    backgroundID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lightColorID = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    lightID = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    paperdollState = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    renderStatus = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    neverRender = 0;

}

export default CjsCharacterPaperdoll;
