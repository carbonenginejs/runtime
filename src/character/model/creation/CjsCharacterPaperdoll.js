import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
@meta.define({ className: "CjsCharacterPaperdoll", family: "character" })
export class CjsCharacterPaperdoll extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browLeftCurl = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browLeftTighten = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browLeftUpDown = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browRightCurl = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browRightTighten = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    browRightUpDown = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraFieldOfView = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraPoiX = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraPoiY = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraPoiZ = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraX = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraY = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    cameraZ = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterColorSelection")
    colorSelections = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    creationDate = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    eyeClose = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    eyesLookHorizontal = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    eyesLookVertical = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    frownLeft = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    frownRight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    hairDarkness = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    headLookTargetX = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    headLookTargetY = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    headLookTargetZ = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    headTilt = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    jawSideways = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    jawUp = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lastRendered = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lastUpdate = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    lightIntensity = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterModifierSelection")
    modifiers = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    orientChar = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    portraitPoseNumber = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    puckerLips = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterSculptSelection")
    sculptWeights = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    smileLeft = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    smileRight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    squintLeft = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    squintRight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPortraitResource")
    backgroundID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lightColorID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    lightID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    paperdollState = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    renderStatus = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    neverRender = 0;

}

export default CjsCharacterPaperdoll;
