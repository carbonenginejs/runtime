import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
@meta.define("CjsCharacterPaperdoll")
export class CjsCharacterPaperdoll extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.float64
    browLeftCurl = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    browLeftTighten = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    browLeftUpDown = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    browRightCurl = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    browRightTighten = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    browRightUpDown = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraFieldOfView = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraPoiX = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraPoiY = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraPoiZ = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraX = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraY = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    cameraZ = 0;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterColorSelection")
    colorSelections = [];

    @blue.readwrite
    @blue.persist
    @type.string
    creationDate = "";

    @blue.readwrite
    @blue.persist
    @type.float64
    eyeClose = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    eyesLookHorizontal = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    eyesLookVertical = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    frownLeft = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    frownRight = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    hairDarkness = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    headLookTargetX = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    headLookTargetY = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    headLookTargetZ = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    headTilt = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    jawSideways = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    jawUp = 0;

    @blue.readwrite
    @blue.persist
    @type.string
    lastRendered = "";

    @blue.readwrite
    @blue.persist
    @type.string
    lastUpdate = "";

    @blue.readwrite
    @blue.persist
    @type.float64
    lightIntensity = 0;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterModifierSelection")
    modifiers = [];

    @blue.readwrite
    @blue.persist
    @type.float64
    orientChar = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    portraitPoseNumber = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    puckerLips = 0;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterSculptSelection")
    sculptWeights = [];

    @blue.readwrite
    @blue.persist
    @type.float64
    smileLeft = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    smileRight = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    squintLeft = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    squintRight = 0;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPortraitResource")
    backgroundID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    lightColorID = "";

    @blue.readwrite
    @blue.persist
    @type.string
    lightID = "";

    @blue.readwrite
    @blue.persist
    @type.int32
    paperdollState = 0;

    @blue.readwrite
    @blue.persist
    @type.int32
    renderStatus = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    neverRender = 0;

}

export default CjsCharacterPaperdoll;
