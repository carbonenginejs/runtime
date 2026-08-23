import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
@type.define({ className: "CjsCharacterPaperdoll", family: "character" })
export class CjsCharacterPaperdoll extends CjsCharacterRecord
{

    @io.readwrite
    @type.float64
    browLeftCurl = 0;

    @io.readwrite
    @type.float64
    browLeftTighten = 0;

    @io.readwrite
    @type.float64
    browLeftUpDown = 0;

    @io.readwrite
    @type.float64
    browRightCurl = 0;

    @io.readwrite
    @type.float64
    browRightTighten = 0;

    @io.readwrite
    @type.float64
    browRightUpDown = 0;

    @io.readwrite
    @type.float64
    cameraFieldOfView = 0;

    @io.readwrite
    @type.float64
    cameraPoiX = 0;

    @io.readwrite
    @type.float64
    cameraPoiY = 0;

    @io.readwrite
    @type.float64
    cameraPoiZ = 0;

    @io.readwrite
    @type.float64
    cameraX = 0;

    @io.readwrite
    @type.float64
    cameraY = 0;

    @io.readwrite
    @type.float64
    cameraZ = 0;

    @io.readwrite
    @type.list("CjsCharacterColorSelection")
    colorSelections = [];

    @io.readwrite
    @type.string
    creationDate = "";

    @io.readwrite
    @type.float64
    eyeClose = 0;

    @io.readwrite
    @type.float64
    eyesLookHorizontal = 0;

    @io.readwrite
    @type.float64
    eyesLookVertical = 0;

    @io.readwrite
    @type.float64
    frownLeft = 0;

    @io.readwrite
    @type.float64
    frownRight = 0;

    @io.readwrite
    @type.float64
    hairDarkness = 0;

    @io.readwrite
    @type.float64
    headLookTargetX = 0;

    @io.readwrite
    @type.float64
    headLookTargetY = 0;

    @io.readwrite
    @type.float64
    headLookTargetZ = 0;

    @io.readwrite
    @type.float64
    headTilt = 0;

    @io.readwrite
    @type.float64
    jawSideways = 0;

    @io.readwrite
    @type.float64
    jawUp = 0;

    @io.readwrite
    @type.string
    lastRendered = "";

    @io.readwrite
    @type.string
    lastUpdate = "";

    @io.readwrite
    @type.float64
    lightIntensity = 0;

    @io.readwrite
    @type.list("CjsCharacterModifierSelection")
    modifiers = [];

    @io.readwrite
    @type.float64
    orientChar = 0;

    @io.readwrite
    @type.float64
    portraitPoseNumber = 0;

    @io.readwrite
    @type.float64
    puckerLips = 0;

    @io.readwrite
    @type.list("CjsCharacterSculptSelection")
    sculptWeights = [];

    @io.readwrite
    @type.float64
    smileLeft = 0;

    @io.readwrite
    @type.float64
    smileRight = 0;

    @io.readwrite
    @type.float64
    squintLeft = 0;

    @io.readwrite
    @type.float64
    squintRight = 0;

    @io.readwrite
    @type.model("CjsCharacterPortraitResource")
    backgroundID = null;

    @io.readwrite
    @type.string
    lightColorID = "";

    @io.readwrite
    @type.string
    lightID = "";

    @io.readwrite
    @type.int32
    paperdollState = 0;

    @io.readwrite
    @type.int32
    renderStatus = null;

    @io.readwrite
    @type.int32
    neverRender = 0;

}

export default CjsCharacterPaperdoll;
