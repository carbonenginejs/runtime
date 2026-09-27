import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
@type.define({ className: "CjsCharacterPaperdoll", family: "character" })
export class CjsCharacterPaperdoll extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.float64
    browLeftCurl = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    browLeftTighten = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    browLeftUpDown = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    browRightCurl = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    browRightTighten = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    browRightUpDown = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraFieldOfView = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraPoiX = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraPoiY = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraPoiZ = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraX = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraY = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    cameraZ = 0;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterColorSelection")
    colorSelections = [];

    @edit.readwrite
    @edit.persist
    @type.string
    creationDate = "";

    @edit.readwrite
    @edit.persist
    @type.float64
    eyeClose = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    eyesLookHorizontal = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    eyesLookVertical = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    frownLeft = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    frownRight = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    hairDarkness = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    headLookTargetX = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    headLookTargetY = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    headLookTargetZ = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    headTilt = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    jawSideways = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    jawUp = 0;

    @edit.readwrite
    @edit.persist
    @type.string
    lastRendered = "";

    @edit.readwrite
    @edit.persist
    @type.string
    lastUpdate = "";

    @edit.readwrite
    @edit.persist
    @type.float64
    lightIntensity = 0;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterModifierSelection")
    modifiers = [];

    @edit.readwrite
    @edit.persist
    @type.float64
    orientChar = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    portraitPoseNumber = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    puckerLips = 0;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterSculptSelection")
    sculptWeights = [];

    @edit.readwrite
    @edit.persist
    @type.float64
    smileLeft = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    smileRight = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    squintLeft = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    squintRight = 0;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterPortraitResource")
    backgroundID = null;

    @edit.readwrite
    @edit.persist
    @type.string
    lightColorID = "";

    @edit.readwrite
    @edit.persist
    @type.string
    lightID = "";

    @edit.readwrite
    @edit.persist
    @type.int32
    paperdollState = 0;

    @edit.readwrite
    @edit.persist
    @type.int32
    renderStatus = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    neverRender = 0;

}

export default CjsCharacterPaperdoll;
