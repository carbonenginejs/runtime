import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2SpriteObjectPickState } from './enums.js';

let _initProto, _initClass, _init_pickState, _init_extra_pickState, _init_ubershader2d, _init_extra_ubershader2d, _init_ubershader3d, _init_extra_ubershader3d, _init_displayWidth, _init_extra_displayWidth, _init_displayHeight, _init_extra_displayHeight, _init_backgroundColor, _init_extra_backgroundColor, _init_background, _init_extra_background, _init_captureIndexDataCapacity, _init_extra_captureIndexDataCapacity, _init_curveSets, _init_extra_curveSets, _init_ignoreClip, _init_extra_ignoreClip, _init_clearFinishedCurveSets, _init_extra_clearFinishedCurveSets, _init_clearBackground, _init_extra_clearBackground, _init_is2dRender, _init_extra_is2dRender, _init_is2dPick, _init_extra_is2dPick, _init_drawWireFrame, _init_extra_drawWireFrame, _init_display, _init_extra_display, _init_isFullscreen, _init_extra_isFullscreen, _init_depthMax, _init_extra_depthMax, _init_maxSpriteCount, _init_extra_maxSpriteCount, _init_depthMin, _init_extra_depthMin, _init_lastPickPos, _init_extra_lastPickPos, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_children, _init_extra_children, _init_maxDrawCallsToRender, _init_extra_maxDrawCallsToRender, _init_maxItemsToRender, _init_extra_maxItemsToRender, _init_name, _init_extra_name, _init_translation, _init_extra_translation, _init_defaultTextureUpdates, _init_extra_defaultTextureUpdates, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY;

/** Tr2Sprite2dScene (sprite2d) - generated from schema shapeHash ba1b8287.... */
let _Tr2Sprite2dScene;
new class extends _identity {
  static [class Tr2Sprite2dScene extends CjsModel {
    static {
      ({
        e: [_init_pickState, _init_extra_pickState, _init_ubershader2d, _init_extra_ubershader2d, _init_ubershader3d, _init_extra_ubershader3d, _init_displayWidth, _init_extra_displayWidth, _init_displayHeight, _init_extra_displayHeight, _init_backgroundColor, _init_extra_backgroundColor, _init_background, _init_extra_background, _init_captureIndexDataCapacity, _init_extra_captureIndexDataCapacity, _init_curveSets, _init_extra_curveSets, _init_ignoreClip, _init_extra_ignoreClip, _init_clearFinishedCurveSets, _init_extra_clearFinishedCurveSets, _init_clearBackground, _init_extra_clearBackground, _init_is2dRender, _init_extra_is2dRender, _init_is2dPick, _init_extra_is2dPick, _init_drawWireFrame, _init_extra_drawWireFrame, _init_display, _init_extra_display, _init_isFullscreen, _init_extra_isFullscreen, _init_depthMax, _init_extra_depthMax, _init_maxSpriteCount, _init_extra_maxSpriteCount, _init_depthMin, _init_extra_depthMin, _init_lastPickPos, _init_extra_lastPickPos, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_children, _init_extra_children, _init_maxDrawCallsToRender, _init_extra_maxDrawCallsToRender, _init_maxItemsToRender, _init_extra_maxItemsToRender, _init_name, _init_extra_name, _init_translation, _init_extra_translation, _init_defaultTextureUpdates, _init_extra_defaultTextureUpdates, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY, _initProto],
        c: [_Tr2Sprite2dScene, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dScene",
        family: "sprite2d"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2SpriteObjectPickState")], 16, "pickState"], [[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "ubershader2d"], [[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "ubershader3d"], [[io, io.persist, type, type.float32], 16, "displayWidth"], [[io, io.persist, type, type.float32], 16, "displayHeight"], [[io, io.persist, type, type.color], 16, "backgroundColor"], [[io, io.persist, void 0, type.list("ITr2SpriteObject")], 16, "background"], [[io, io.read, type, type.uint32], 16, "captureIndexDataCapacity"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, type, type.boolean], 16, "ignoreClip"], [[io, io.persist, type, type.boolean], 16, "clearFinishedCurveSets"], [[io, io.persist, type, type.boolean], 16, "clearBackground"], [[io, io.persist, type, type.boolean], 16, "is2dRender"], [[io, io.persist, type, type.boolean], 16, "is2dPick"], [[io, io.persist, type, type.boolean], 16, "drawWireFrame"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "isFullscreen"], [[io, io.persist, type, type.float32], 16, "depthMax"], [[io, io.notify, io, io.readwrite, type, type.uint32], 16, "maxSpriteCount"], [[io, io.persist, type, type.float32], 16, "depthMin"], [[io, io.read, type, type.vec2], 16, "lastPickPos"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, void 0, type.list("ITr2SpriteObject")], 16, "children"], [[io, io.readwrite, type, type.uint32], 16, "maxDrawCallsToRender"], [[io, io.readwrite, type, type.uint32], 16, "maxItemsToRender"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.readwrite, type, type.boolean], 16, "defaultTextureUpdates"], [[io, io.persist, type, type.vec3], 16, "displayX"], [[io, io.persist, type, type.vec3], 16, "displayY"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickObject"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_displayY(this);
    }
    /** m_pickState (Tr2SpriteObjectPickState - enum Tr2SpriteObjectPickState) [READWRITE, PERSIST, ENUM] */
    pickState = (_initProto(this), _init_pickState(this, 1));

    /** m_uberShader2d (Tr2EffectPtr) [READ] */
    ubershader2d = (_init_extra_pickState(this), _init_ubershader2d(this, null));

    /** m_uberShader3d (Tr2EffectPtr) [READ] */
    ubershader3d = (_init_extra_ubershader2d(this), _init_ubershader3d(this, null));

    /** m_displayWidth (float) [READWRITE, PERSIST] */
    displayWidth = (_init_extra_ubershader3d(this), _init_displayWidth(this, 1));

    /** m_displayHeight (float) [READWRITE, PERSIST] */
    displayHeight = (_init_extra_displayWidth(this), _init_displayHeight(this, 1));

    /** m_backgroundColor (Color) [READWRITE, PERSIST] */
    backgroundColor = (_init_extra_displayHeight(this), _init_backgroundColor(this, vec4.create()));

    /** m_background (PITr2SpriteObjectVector) [READ, PERSIST] */
    background = (_init_extra_backgroundColor(this), _init_background(this, []));

    /** m_captureIndexDataCapacity (unsigned int) [READ] */
    captureIndexDataCapacity = (_init_extra_background(this), _init_captureIndexDataCapacity(this, 0));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_captureIndexDataCapacity(this), _init_curveSets(this, []));

    /** m_ignoreClip (bool) [READWRITE, PERSIST] */
    ignoreClip = (_init_extra_curveSets(this), _init_ignoreClip(this, false));

    /** m_clearFinishedCurveSets (bool) [READWRITE, PERSIST] */
    clearFinishedCurveSets = (_init_extra_ignoreClip(this), _init_clearFinishedCurveSets(this, false));

    /** m_clearBackground (bool) [READWRITE, PERSIST] */
    clearBackground = (_init_extra_clearFinishedCurveSets(this), _init_clearBackground(this, false));

    /** m_is2dRender (bool) [READWRITE, PERSIST] */
    is2dRender = (_init_extra_clearBackground(this), _init_is2dRender(this, true));

    /** m_is2dPick (bool) [READWRITE, PERSIST] */
    is2dPick = (_init_extra_is2dRender(this), _init_is2dPick(this, true));

    /** m_drawWireFrame (bool) [READWRITE, PERSIST] */
    drawWireFrame = (_init_extra_is2dPick(this), _init_drawWireFrame(this, false));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_drawWireFrame(this), _init_display(this, true));

    /** m_isFullscreen (bool) [READWRITE, PERSIST] */
    isFullscreen = (_init_extra_display(this), _init_isFullscreen(this, false));

    /** m_depthMax (float) [READWRITE, PERSIST] */
    depthMax = (_init_extra_isFullscreen(this), _init_depthMax(this, 0));

    /** m_maxSpriteCount (unsigned int) [READWRITE, NOTIFY] */
    maxSpriteCount = (_init_extra_depthMax(this), _init_maxSpriteCount(this, 1024));

    /** m_depthMin (float) [READWRITE, PERSIST] */
    depthMin = (_init_extra_maxSpriteCount(this), _init_depthMin(this, 0));

    /** m_lastPickPos (Vector2) [READ] */
    lastPickPos = (_init_extra_depthMin(this), _init_lastPickPos(this, vec2.create()));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_lastPickPos(this), _init_rotation(this, quat.create()));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_children (PITr2SpriteObjectVector) [READ, PERSIST] */
    children = (_init_extra_scaling(this), _init_children(this, []));

    /** m_maxDrawCallsToRender (unsigned int) [READWRITE] */
    maxDrawCallsToRender = (_init_extra_children(this), _init_maxDrawCallsToRender(this, 4294967295));

    /** m_maxItemsToRender (unsigned int) [READWRITE] */
    maxItemsToRender = (_init_extra_maxDrawCallsToRender(this), _init_maxItemsToRender(this, 4294967295));

    /** m_name (std::wstring) [READWRITE, PERSIST] */
    name = (_init_extra_maxItemsToRender(this), _init_name(this, ""));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_name(this), _init_translation(this, vec3.create()));

    /** m_defaultTextureUpdates (bool) [READWRITE] */
    defaultTextureUpdates = (_init_extra_translation(this), _init_defaultTextureUpdates(this, false));

    /** m_translation.x (Vector3) [READWRITE, PERSIST] */
    displayX = (_init_extra_defaultTextureUpdates(this), _init_displayX(this, vec3.create()));

    /** m_translation.y (Vector3) [READWRITE, PERSIST] */
    displayY = (_init_extra_displayX(this), _init_displayY(this, vec3.create()));

    /** Carbon method PickObject (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    PickObject(...args) {
      throw new Error("Tr2Sprite2dScene.PickObject is not implemented in CarbonEngineJS.");
    }
  }];
  Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;
  constructor() {
    super(_Tr2Sprite2dScene), _initClass();
  }
}();

export { _Tr2Sprite2dScene as Tr2Sprite2dScene };
//# sourceMappingURL=Tr2Sprite2dScene.js.map
