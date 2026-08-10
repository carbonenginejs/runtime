import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2VolumerticQuality } from './enums.js';

let _initClass, _init_quality, _init_extra_quality, _init_mieEnvironmentMap, _init_extra_mieEnvironmentMap, _init_blur, _init_extra_blur, _init_logBlending, _init_extra_logBlending, _init_gameBackClip, _init_extra_gameBackClip, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_thickness, _init_extra_thickness, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_lightDirectionality, _init_extra_lightDirectionality, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseMovementSpeed, _init_extra_fogNoiseMovementSpeed, _init_fogColor, _init_extra_fogColor, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_logBlendingSmoothness, _init_extra_logBlendingSmoothness, _init_environmentIntensity, _init_extra_environmentIntensity, _init_castShadows, _init_extra_castShadows, _init_receiveShadows, _init_extra_receiveShadows, _init_scaleFactor, _init_extra_scaleFactor;

/** Tr2VolumetricsRenderer (trinityCore) - generated from schema shapeHash d0fc1a46.... */
let _Tr2VolumetricsRender;
new class extends _identity {
  static [class Tr2VolumetricsRenderer extends CjsModel {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_mieEnvironmentMap, _init_extra_mieEnvironmentMap, _init_blur, _init_extra_blur, _init_logBlending, _init_extra_logBlending, _init_gameBackClip, _init_extra_gameBackClip, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_thickness, _init_extra_thickness, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_lightDirectionality, _init_extra_lightDirectionality, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseMovementSpeed, _init_extra_fogNoiseMovementSpeed, _init_fogColor, _init_extra_fogColor, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_logBlendingSmoothness, _init_extra_logBlendingSmoothness, _init_environmentIntensity, _init_extra_environmentIntensity, _init_castShadows, _init_extra_castShadows, _init_receiveShadows, _init_extra_receiveShadows, _init_scaleFactor, _init_extra_scaleFactor],
        c: [_Tr2VolumetricsRender, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2VolumetricsRenderer",
        family: "trinityCore"
      })], [[[io, io.readwrite, type, type.int32, void 0, type.enum("Tr2VolumerticQuality")], 16, "quality"], [[io, io.read, void 0, type.objectRef("Tr2TextureReference")], 16, "mieEnvironmentMap"], [[io, io.readwrite, type, type.boolean], 16, "blur"], [[io, io.readwrite, type, type.boolean], 16, "logBlending"], [[io, io.readwrite, type, type.float32], 16, "gameBackClip"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "backgroundVisibility"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "thickness"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "environmentDirectionality"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "lightDirectionality"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "godRayNoiseAnimationSpeed"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "fogNoiseMovementSpeed"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "fogColor"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "godRayNoiseFrequency"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "fogNoiseFrequency"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "godRayNoiseIntensity"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "fogNoiseIntensity"], [[io, io.readwrite, type, type.float64], 16, "logBlendingSmoothness"], [[io, io.read, void 0, type.rawStruct("ITr2FroxelFogSettings::FroxelFogSettings")], 16, "environmentIntensity"], [[io, io.readwrite, type, type.boolean], 16, "castShadows"], [[io, io.readwrite, type, type.boolean], 16, "receiveShadows"], [[io, io.readwrite, type, type.float32], 16, "scaleFactor"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_scaleFactor(this);
    }
    /** m_quality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, ENUM] */
    quality = _init_quality(this, 2);

    /** m_mieEnvironmentMap (Tr2TextureReferencePtr) [READ] */
    mieEnvironmentMap = (_init_extra_quality(this), _init_mieEnvironmentMap(this, null));

    /** m_blur (bool) [READWRITE] */
    blur = (_init_extra_mieEnvironmentMap(this), _init_blur(this, true));

    /** m_logBlending (bool) [READWRITE] */
    logBlending = (_init_extra_blur(this), _init_logBlending(this, true));

    /** m_gameBackClip (float) [READWRITE] */
    gameBackClip = (_init_extra_logBlending(this), _init_gameBackClip(this, 0));

    /** m_froxelFogSettings.backgroundVisibility.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    backgroundVisibility = (_init_extra_gameBackClip(this), _init_backgroundVisibility(this, null));

    /** m_froxelFogSettings.thickness.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    thickness = (_init_extra_backgroundVisibility(this), _init_thickness(this, null));

    /** m_froxelFogSettings.environmentDirectionality.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    environmentDirectionality = (_init_extra_thickness(this), _init_environmentDirectionality(this, null));

    /** m_froxelFogSettings.lightDirectionality.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    lightDirectionality = (_init_extra_environmentDirectionality(this), _init_lightDirectionality(this, null));

    /** m_froxelFogSettings.godRayNoiseAnimationSpeed.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    godRayNoiseAnimationSpeed = (_init_extra_lightDirectionality(this), _init_godRayNoiseAnimationSpeed(this, null));

    /** m_froxelFogSettings.fogNoiseMovementSpeed.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    fogNoiseMovementSpeed = (_init_extra_godRayNoiseAnimationSpeed(this), _init_fogNoiseMovementSpeed(this, null));

    /** m_froxelFogSettings.fogColor.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    fogColor = (_init_extra_fogNoiseMovementSpeed(this), _init_fogColor(this, null));

    /** m_froxelFogSettings.godRayNoiseFrequency.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    godRayNoiseFrequency = (_init_extra_fogColor(this), _init_godRayNoiseFrequency(this, null));

    /** m_froxelFogSettings.fogNoiseFrequency.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    fogNoiseFrequency = (_init_extra_godRayNoiseFrequency(this), _init_fogNoiseFrequency(this, null));

    /** m_froxelFogSettings.godRayNoiseIntensity.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    godRayNoiseIntensity = (_init_extra_fogNoiseFrequency(this), _init_godRayNoiseIntensity(this, null));

    /** m_froxelFogSettings.fogNoiseIntensity.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    fogNoiseIntensity = (_init_extra_godRayNoiseIntensity(this), _init_fogNoiseIntensity(this, null));

    /** m_logBlendingSmoothness (double) [READWRITE] */
    logBlendingSmoothness = (_init_extra_fogNoiseIntensity(this), _init_logBlendingSmoothness(this, 4));

    /** m_froxelFogSettings.environmentIntensity.value (ITr2FroxelFogSettings::FroxelFogSettings) [READ] */
    environmentIntensity = (_init_extra_logBlendingSmoothness(this), _init_environmentIntensity(this, null));

    /** m_castShadows (bool) [READWRITE] */
    castShadows = (_init_extra_environmentIntensity(this), _init_castShadows(this, false));

    /** m_receiveShadows (bool) [READWRITE] */
    receiveShadows = (_init_extra_castShadows(this), _init_receiveShadows(this, false));

    /** m_scaleFactor (float) [READWRITE] */
    scaleFactor = (_init_extra_receiveShadows(this), _init_scaleFactor(this, 0.7));
  }];
  Tr2VolumerticQuality = Tr2VolumerticQuality;
  constructor() {
    super(_Tr2VolumetricsRender), _initClass();
  }
}();

export { _Tr2VolumetricsRender as Tr2VolumetricsRenderer };
//# sourceMappingURL=Tr2VolumetricsRenderer.js.map
