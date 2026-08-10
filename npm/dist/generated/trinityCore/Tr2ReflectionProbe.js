import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_renderFrequency, _init_extra_renderFrequency, _init_currentFrame, _init_extra_currentFrame, _init_customSourceTexture, _init_extra_customSourceTexture, _init_backlightColor, _init_extra_backlightColor, _init_backlightContrast, _init_extra_backlightContrast, _init_hollywoodMode, _init_extra_hollywoodMode, _init_reflectionTexture, _init_extra_reflectionTexture, _init_hdrOutput, _init_extra_hdrOutput, _init_lockPosition, _init_extra_lockPosition, _init_position, _init_extra_position, _init_reflectionSize, _init_extra_reflectionSize, _init_unfilteredTexture, _init_extra_unfilteredTexture;

/** Tr2ReflectionProbe (trinityCore) - generated from schema shapeHash 75d5a20a.... */
let _Tr2ReflectionProbe;
new class extends _identity {
  static [class Tr2ReflectionProbe extends CjsModel {
    static {
      ({
        e: [_init_renderFrequency, _init_extra_renderFrequency, _init_currentFrame, _init_extra_currentFrame, _init_customSourceTexture, _init_extra_customSourceTexture, _init_backlightColor, _init_extra_backlightColor, _init_backlightContrast, _init_extra_backlightContrast, _init_hollywoodMode, _init_extra_hollywoodMode, _init_reflectionTexture, _init_extra_reflectionTexture, _init_hdrOutput, _init_extra_hdrOutput, _init_lockPosition, _init_extra_lockPosition, _init_position, _init_extra_position, _init_reflectionSize, _init_extra_reflectionSize, _init_unfilteredTexture, _init_extra_unfilteredTexture, _initProto],
        c: [_Tr2ReflectionProbe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ReflectionProbe",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("ReflectionProbeRenderFrequency")], 16, "renderFrequency"], [[io, io.read, type, type.uint8], 16, "currentFrame"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("ITriTextureRes")], 16, "customSourceTexture"], [[io, io.read, type, type.color], 16, "backlightColor"], [[io, io.read, type, type.float32], 16, "backlightContrast"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "hollywoodMode"], [[io, io.read, void 0, type.objectRef("Tr2RenderTarget")], 16, "reflectionTexture"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "hdrOutput"], [[io, io.readwrite, type, type.boolean], 16, "lockPosition"], [[io, io.readwrite, type, type.vec3], 16, "position"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "reflectionSize"], [[io, io.read, void 0, type.objectRef("Tr2RenderTarget")], 16, "unfilteredTexture"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RunFilter"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_unfilteredTexture(this);
    }
    /** m_renderFrequency (ReflectionProbeRenderFrequency - enum ReflectionProbeRenderFrequency) [READWRITE, NOTIFY, ENUM] */
    renderFrequency = (_initProto(this), _init_renderFrequency(this, 0));

    /** m_currentFrame (uint8_t) [READ] */
    currentFrame = (_init_extra_renderFrequency(this), _init_currentFrame(this, 0));

    /** m_customSourceTexture (ITriTextureResPtr) [READWRITE, NOTIFY] */
    customSourceTexture = (_init_extra_currentFrame(this), _init_customSourceTexture(this, null));

    /** m_backlightColor (Color) [READ] */
    backlightColor = (_init_extra_customSourceTexture(this), _init_backlightColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_backlightContrast (float) [READ] */
    backlightContrast = (_init_extra_backlightColor(this), _init_backlightContrast(this, 16));

    /** m_hollywoodMode (bool) [READWRITE, NOTIFY] */
    hollywoodMode = (_init_extra_backlightContrast(this), _init_hollywoodMode(this, true));

    /** m_postFilterTarget (Tr2RenderTargetPtr) [READ] */
    reflectionTexture = (_init_extra_hollywoodMode(this), _init_reflectionTexture(this, null));

    /** m_hdrOutput (bool) [READWRITE, NOTIFY] */
    hdrOutput = (_init_extra_reflectionTexture(this), _init_hdrOutput(this, true));

    /** m_lockPosition (bool) [READWRITE] */
    lockPosition = (_init_extra_hdrOutput(this), _init_lockPosition(this, false));

    /** m_position (Vector3) [READWRITE] */
    position = (_init_extra_lockPosition(this), _init_position(this, vec3.create()));

    /** m_intermediateSize (int) [READWRITE, NOTIFY] */
    reflectionSize = (_init_extra_position(this), _init_reflectionSize(this, 0));

    /** m_renderTargetCube (Tr2RenderTargetPtr) [READ] */
    unfilteredTexture = (_init_extra_reflectionSize(this), _init_unfilteredTexture(this, null));

    /** Carbon method RunFilter (MAP_METHOD_AND_WRAP). */
    RunFilter(...args) {
      throw new Error("Tr2ReflectionProbe.RunFilter is not implemented in CarbonEngineJS.");
    }
  }];
  ReflectionProbeRenderFrequency = Object.freeze({
    ONE_SIDE_PER_FRAME: 0,
    ALL_SIDES_PER_FRAME: 1
  });
  constructor() {
    super(_Tr2ReflectionProbe), _initClass();
  }
}();

export { _Tr2ReflectionProbe as Tr2ReflectionProbe };
//# sourceMappingURL=Tr2ReflectionProbe.js.map
