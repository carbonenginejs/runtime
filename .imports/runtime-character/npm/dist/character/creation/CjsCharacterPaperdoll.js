import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_browLeftCurl, _init_extra_browLeftCurl, _init_browLeftTighten, _init_extra_browLeftTighten, _init_browLeftUpDown, _init_extra_browLeftUpDown, _init_browRightCurl, _init_extra_browRightCurl, _init_browRightTighten, _init_extra_browRightTighten, _init_browRightUpDown, _init_extra_browRightUpDown, _init_cameraFieldOfView, _init_extra_cameraFieldOfView, _init_cameraPoiX, _init_extra_cameraPoiX, _init_cameraPoiY, _init_extra_cameraPoiY, _init_cameraPoiZ, _init_extra_cameraPoiZ, _init_cameraX, _init_extra_cameraX, _init_cameraY, _init_extra_cameraY, _init_cameraZ, _init_extra_cameraZ, _init_colorSelections, _init_extra_colorSelections, _init_creationDate, _init_extra_creationDate, _init_eyeClose, _init_extra_eyeClose, _init_eyesLookHorizontal, _init_extra_eyesLookHorizontal, _init_eyesLookVertical, _init_extra_eyesLookVertical, _init_frownLeft, _init_extra_frownLeft, _init_frownRight, _init_extra_frownRight, _init_hairDarkness, _init_extra_hairDarkness, _init_headLookTargetX, _init_extra_headLookTargetX, _init_headLookTargetY, _init_extra_headLookTargetY, _init_headLookTargetZ, _init_extra_headLookTargetZ, _init_headTilt, _init_extra_headTilt, _init_jawSideways, _init_extra_jawSideways, _init_jawUp, _init_extra_jawUp, _init_lastRendered, _init_extra_lastRendered, _init_lastUpdate, _init_extra_lastUpdate, _init_lightIntensity, _init_extra_lightIntensity, _init_modifiers, _init_extra_modifiers, _init_orientChar, _init_extra_orientChar, _init_portraitPoseNumber, _init_extra_portraitPoseNumber, _init_puckerLips, _init_extra_puckerLips, _init_sculptWeights, _init_extra_sculptWeights, _init_smileLeft, _init_extra_smileLeft, _init_smileRight, _init_extra_smileRight, _init_squintLeft, _init_extra_squintLeft, _init_squintRight, _init_extra_squintRight, _init_backgroundID, _init_extra_backgroundID, _init_lightColorID, _init_extra_lightColorID, _init_lightID, _init_extra_lightID, _init_paperdollState, _init_extra_paperdollState, _init_renderStatus, _init_extra_renderStatus, _init_neverRender, _init_extra_neverRender;

/** Source-backed paper-doll appearance, portrait pose, and expression record. */
let _CjsCharacterPaperdol;
class CjsCharacterPaperdoll extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_browLeftCurl, _init_extra_browLeftCurl, _init_browLeftTighten, _init_extra_browLeftTighten, _init_browLeftUpDown, _init_extra_browLeftUpDown, _init_browRightCurl, _init_extra_browRightCurl, _init_browRightTighten, _init_extra_browRightTighten, _init_browRightUpDown, _init_extra_browRightUpDown, _init_cameraFieldOfView, _init_extra_cameraFieldOfView, _init_cameraPoiX, _init_extra_cameraPoiX, _init_cameraPoiY, _init_extra_cameraPoiY, _init_cameraPoiZ, _init_extra_cameraPoiZ, _init_cameraX, _init_extra_cameraX, _init_cameraY, _init_extra_cameraY, _init_cameraZ, _init_extra_cameraZ, _init_colorSelections, _init_extra_colorSelections, _init_creationDate, _init_extra_creationDate, _init_eyeClose, _init_extra_eyeClose, _init_eyesLookHorizontal, _init_extra_eyesLookHorizontal, _init_eyesLookVertical, _init_extra_eyesLookVertical, _init_frownLeft, _init_extra_frownLeft, _init_frownRight, _init_extra_frownRight, _init_hairDarkness, _init_extra_hairDarkness, _init_headLookTargetX, _init_extra_headLookTargetX, _init_headLookTargetY, _init_extra_headLookTargetY, _init_headLookTargetZ, _init_extra_headLookTargetZ, _init_headTilt, _init_extra_headTilt, _init_jawSideways, _init_extra_jawSideways, _init_jawUp, _init_extra_jawUp, _init_lastRendered, _init_extra_lastRendered, _init_lastUpdate, _init_extra_lastUpdate, _init_lightIntensity, _init_extra_lightIntensity, _init_modifiers, _init_extra_modifiers, _init_orientChar, _init_extra_orientChar, _init_portraitPoseNumber, _init_extra_portraitPoseNumber, _init_puckerLips, _init_extra_puckerLips, _init_sculptWeights, _init_extra_sculptWeights, _init_smileLeft, _init_extra_smileLeft, _init_smileRight, _init_extra_smileRight, _init_squintLeft, _init_extra_squintLeft, _init_squintRight, _init_extra_squintRight, _init_backgroundID, _init_extra_backgroundID, _init_lightColorID, _init_extra_lightColorID, _init_lightID, _init_extra_lightID, _init_paperdollState, _init_extra_paperdollState, _init_renderStatus, _init_extra_renderStatus, _init_neverRender, _init_extra_neverRender],
      c: [_CjsCharacterPaperdol, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPaperdoll",
      family: "character"
    })], [[[io, io.readwrite, type, type.float64], 16, "browLeftCurl"], [[io, io.readwrite, type, type.float64], 16, "browLeftTighten"], [[io, io.readwrite, type, type.float64], 16, "browLeftUpDown"], [[io, io.readwrite, type, type.float64], 16, "browRightCurl"], [[io, io.readwrite, type, type.float64], 16, "browRightTighten"], [[io, io.readwrite, type, type.float64], 16, "browRightUpDown"], [[io, io.readwrite, type, type.float64], 16, "cameraFieldOfView"], [[io, io.readwrite, type, type.float64], 16, "cameraPoiX"], [[io, io.readwrite, type, type.float64], 16, "cameraPoiY"], [[io, io.readwrite, type, type.float64], 16, "cameraPoiZ"], [[io, io.readwrite, type, type.float64], 16, "cameraX"], [[io, io.readwrite, type, type.float64], 16, "cameraY"], [[io, io.readwrite, type, type.float64], 16, "cameraZ"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorSelection")], 16, "colorSelections"], [[io, io.readwrite, type, type.string], 16, "creationDate"], [[io, io.readwrite, type, type.float64], 16, "eyeClose"], [[io, io.readwrite, type, type.float64], 16, "eyesLookHorizontal"], [[io, io.readwrite, type, type.float64], 16, "eyesLookVertical"], [[io, io.readwrite, type, type.float64], 16, "frownLeft"], [[io, io.readwrite, type, type.float64], 16, "frownRight"], [[io, io.readwrite, type, type.float64], 16, "hairDarkness"], [[io, io.readwrite, type, type.float64], 16, "headLookTargetX"], [[io, io.readwrite, type, type.float64], 16, "headLookTargetY"], [[io, io.readwrite, type, type.float64], 16, "headLookTargetZ"], [[io, io.readwrite, type, type.float64], 16, "headTilt"], [[io, io.readwrite, type, type.float64], 16, "jawSideways"], [[io, io.readwrite, type, type.float64], 16, "jawUp"], [[io, io.readwrite, type, type.string], 16, "lastRendered"], [[io, io.readwrite, type, type.string], 16, "lastUpdate"], [[io, io.readwrite, type, type.float64], 16, "lightIntensity"], [[io, io.readwrite, void 0, type.list("CjsCharacterModifierSelection")], 16, "modifiers"], [[io, io.readwrite, type, type.float64], 16, "orientChar"], [[io, io.readwrite, type, type.float64], 16, "portraitPoseNumber"], [[io, io.readwrite, type, type.float64], 16, "puckerLips"], [[io, io.readwrite, void 0, type.list("CjsCharacterSculptSelection")], 16, "sculptWeights"], [[io, io.readwrite, type, type.float64], 16, "smileLeft"], [[io, io.readwrite, type, type.float64], 16, "smileRight"], [[io, io.readwrite, type, type.float64], 16, "squintLeft"], [[io, io.readwrite, type, type.float64], 16, "squintRight"], [[io, io.readwrite, void 0, type.model("CjsCharacterPortraitResource")], 16, "backgroundID"], [[io, io.readwrite, type, type.string], 16, "lightColorID"], [[io, io.readwrite, type, type.string], 16, "lightID"], [[io, io.readwrite, type, type.int32], 16, "paperdollState"], [[io, io.readwrite, type, type.int32], 16, "renderStatus"], [[io, io.readwrite, type, type.int32], 16, "neverRender"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_neverRender(this);
  }
  browLeftCurl = _init_browLeftCurl(this, 0);
  browLeftTighten = (_init_extra_browLeftCurl(this), _init_browLeftTighten(this, 0));
  browLeftUpDown = (_init_extra_browLeftTighten(this), _init_browLeftUpDown(this, 0));
  browRightCurl = (_init_extra_browLeftUpDown(this), _init_browRightCurl(this, 0));
  browRightTighten = (_init_extra_browRightCurl(this), _init_browRightTighten(this, 0));
  browRightUpDown = (_init_extra_browRightTighten(this), _init_browRightUpDown(this, 0));
  cameraFieldOfView = (_init_extra_browRightUpDown(this), _init_cameraFieldOfView(this, 0));
  cameraPoiX = (_init_extra_cameraFieldOfView(this), _init_cameraPoiX(this, 0));
  cameraPoiY = (_init_extra_cameraPoiX(this), _init_cameraPoiY(this, 0));
  cameraPoiZ = (_init_extra_cameraPoiY(this), _init_cameraPoiZ(this, 0));
  cameraX = (_init_extra_cameraPoiZ(this), _init_cameraX(this, 0));
  cameraY = (_init_extra_cameraX(this), _init_cameraY(this, 0));
  cameraZ = (_init_extra_cameraY(this), _init_cameraZ(this, 0));
  colorSelections = (_init_extra_cameraZ(this), _init_colorSelections(this, []));
  creationDate = (_init_extra_colorSelections(this), _init_creationDate(this, ""));
  eyeClose = (_init_extra_creationDate(this), _init_eyeClose(this, 0));
  eyesLookHorizontal = (_init_extra_eyeClose(this), _init_eyesLookHorizontal(this, 0));
  eyesLookVertical = (_init_extra_eyesLookHorizontal(this), _init_eyesLookVertical(this, 0));
  frownLeft = (_init_extra_eyesLookVertical(this), _init_frownLeft(this, 0));
  frownRight = (_init_extra_frownLeft(this), _init_frownRight(this, 0));
  hairDarkness = (_init_extra_frownRight(this), _init_hairDarkness(this, 0));
  headLookTargetX = (_init_extra_hairDarkness(this), _init_headLookTargetX(this, 0));
  headLookTargetY = (_init_extra_headLookTargetX(this), _init_headLookTargetY(this, 0));
  headLookTargetZ = (_init_extra_headLookTargetY(this), _init_headLookTargetZ(this, 0));
  headTilt = (_init_extra_headLookTargetZ(this), _init_headTilt(this, 0));
  jawSideways = (_init_extra_headTilt(this), _init_jawSideways(this, 0));
  jawUp = (_init_extra_jawSideways(this), _init_jawUp(this, 0));
  lastRendered = (_init_extra_jawUp(this), _init_lastRendered(this, ""));
  lastUpdate = (_init_extra_lastRendered(this), _init_lastUpdate(this, ""));
  lightIntensity = (_init_extra_lastUpdate(this), _init_lightIntensity(this, 0));
  modifiers = (_init_extra_lightIntensity(this), _init_modifiers(this, []));
  orientChar = (_init_extra_modifiers(this), _init_orientChar(this, 0));
  portraitPoseNumber = (_init_extra_orientChar(this), _init_portraitPoseNumber(this, 0));
  puckerLips = (_init_extra_portraitPoseNumber(this), _init_puckerLips(this, 0));
  sculptWeights = (_init_extra_puckerLips(this), _init_sculptWeights(this, []));
  smileLeft = (_init_extra_sculptWeights(this), _init_smileLeft(this, 0));
  smileRight = (_init_extra_smileLeft(this), _init_smileRight(this, 0));
  squintLeft = (_init_extra_smileRight(this), _init_squintLeft(this, 0));
  squintRight = (_init_extra_squintLeft(this), _init_squintRight(this, 0));
  backgroundID = (_init_extra_squintRight(this), _init_backgroundID(this, null));
  lightColorID = (_init_extra_backgroundID(this), _init_lightColorID(this, ""));
  lightID = (_init_extra_lightColorID(this), _init_lightID(this, ""));
  paperdollState = (_init_extra_lightID(this), _init_paperdollState(this, 0));
  renderStatus = (_init_extra_paperdollState(this), _init_renderStatus(this, null));
  neverRender = (_init_extra_renderStatus(this), _init_neverRender(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterPaperdol as CjsCharacterPaperdoll };
//# sourceMappingURL=CjsCharacterPaperdoll.js.map
