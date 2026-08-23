import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_hullParticleRate, _init_extra_hullParticleRate, _init_hullParticleAngle, _init_extra_hullParticleAngle, _init_hullParticleColorMidpoint, _init_extra_hullParticleColorMidpoint, _init_hullParticleInnerAngle, _init_extra_hullParticleInnerAngle, _init_hullParticleMinMaxSpeed, _init_extra_hullParticleMinMaxSpeed, _init_hullParticleMinMaxLifeTime, _init_extra_hullParticleMinMaxLifeTime, _init_hullParticleSizes, _init_extra_hullParticleSizes, _init_hullParticleColor, _init_extra_hullParticleColor, _init_hullParticleColor2, _init_extra_hullParticleColor2, _init_hullParticleColor3, _init_extra_hullParticleColor3, _init_hullParticleColor4, _init_extra_hullParticleColor4, _init_hullParticleTextureIndex, _init_extra_hullParticleTextureIndex, _init_hullParticleVelocityStretchRotation, _init_extra_hullParticleVelocityStretchRotation, _init_hullParticleDrag, _init_extra_hullParticleDrag, _init_hullParticleTurbulenceAmplitude, _init_extra_hullParticleTurbulenceAmplitude, _init_hullParticleTurbulenceFrequency, _init_extra_hullParticleTurbulenceFrequency;

/** EveSOFDataGenericHullDamage (eve) - generated from schema shapeHash 681d5059.... */
let _EveSOFDataGenericHul;
class EveSOFDataGenericHullDamage extends CjsModel {
  static {
    ({
      e: [_init_hullParticleRate, _init_extra_hullParticleRate, _init_hullParticleAngle, _init_extra_hullParticleAngle, _init_hullParticleColorMidpoint, _init_extra_hullParticleColorMidpoint, _init_hullParticleInnerAngle, _init_extra_hullParticleInnerAngle, _init_hullParticleMinMaxSpeed, _init_extra_hullParticleMinMaxSpeed, _init_hullParticleMinMaxLifeTime, _init_extra_hullParticleMinMaxLifeTime, _init_hullParticleSizes, _init_extra_hullParticleSizes, _init_hullParticleColor, _init_extra_hullParticleColor, _init_hullParticleColor2, _init_extra_hullParticleColor2, _init_hullParticleColor3, _init_extra_hullParticleColor3, _init_hullParticleColor4, _init_extra_hullParticleColor4, _init_hullParticleTextureIndex, _init_extra_hullParticleTextureIndex, _init_hullParticleVelocityStretchRotation, _init_extra_hullParticleVelocityStretchRotation, _init_hullParticleDrag, _init_extra_hullParticleDrag, _init_hullParticleTurbulenceAmplitude, _init_extra_hullParticleTurbulenceAmplitude, _init_hullParticleTurbulenceFrequency, _init_extra_hullParticleTurbulenceFrequency],
      c: [_EveSOFDataGenericHul, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericHullDamage",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "hullParticleRate"], [[io, io.persist, type, type.float32], 16, "hullParticleAngle"], [[io, io.persist, type, type.float32], 16, "hullParticleColorMidpoint"], [[io, io.persist, type, type.float32], 16, "hullParticleInnerAngle"], [[io, io.persist, type, type.vec2], 16, "hullParticleMinMaxSpeed"], [[io, io.persist, type, type.vec2], 16, "hullParticleMinMaxLifeTime"], [[io, io.persist, type, type.vec4], 16, "hullParticleSizes"], [[io, io.persist, type, type.color], 16, "hullParticleColor0"], [[io, io.persist, type, type.color], 16, "hullParticleColor1"], [[io, io.persist, type, type.color], 16, "hullParticleColor2"], [[io, io.persist, type, type.color], 16, "hullParticleColor3"], [[io, io.persist, type, type.uint32], 16, "hullParticleTextureIndex"], [[io, io.persist, type, type.float32], 16, "hullParticleVelocityStretchRotation"], [[io, io.persist, type, type.float32], 16, "hullParticleDrag"], [[io, io.persist, type, type.float32], 16, "hullParticleTurbulenceAmplitude"], [[io, io.persist, type, type.uint32], 16, "hullParticleTurbulenceFrequency"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hullParticleTurbulenceFrequency(this);
  }
  /** m_hullParticleRate (float) [READWRITE, PERSIST] */
  hullParticleRate = _init_hullParticleRate(this, 0);

  /** m_hullParticleAngle (float) [READWRITE, PERSIST] */
  hullParticleAngle = (_init_extra_hullParticleRate(this), _init_hullParticleAngle(this, 0));

  /** m_hullParticleColorMidpoint (float) [READWRITE, PERSIST] */
  hullParticleColorMidpoint = (_init_extra_hullParticleAngle(this), _init_hullParticleColorMidpoint(this, 0.5));

  /** m_hullParticleInnerAngle (float) [READWRITE, PERSIST] */
  hullParticleInnerAngle = (_init_extra_hullParticleColorMidpoint(this), _init_hullParticleInnerAngle(this, 0));

  /** m_hullParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  hullParticleMinMaxSpeed = (_init_extra_hullParticleInnerAngle(this), _init_hullParticleMinMaxSpeed(this, vec2.create()));

  /** m_hullParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  hullParticleMinMaxLifeTime = (_init_extra_hullParticleMinMaxSpeed(this), _init_hullParticleMinMaxLifeTime(this, vec2.create()));

  /** m_hullParticleSizes (Vector4) [READWRITE, PERSIST] */
  hullParticleSizes = (_init_extra_hullParticleMinMaxLifeTime(this), _init_hullParticleSizes(this, vec4.create()));

  /** m_hullParticleColor0 (Color) [READWRITE, PERSIST] */
  hullParticleColor0 = (_init_extra_hullParticleSizes(this), _init_hullParticleColor(this, vec4.create()));

  /** m_hullParticleColor1 (Color) [READWRITE, PERSIST] */
  hullParticleColor1 = (_init_extra_hullParticleColor(this), _init_hullParticleColor2(this, vec4.create()));

  /** m_hullParticleColor2 (Color) [READWRITE, PERSIST] */
  hullParticleColor2 = (_init_extra_hullParticleColor2(this), _init_hullParticleColor3(this, vec4.create()));

  /** m_hullParticleColor3 (Color) [READWRITE, PERSIST] */
  hullParticleColor3 = (_init_extra_hullParticleColor3(this), _init_hullParticleColor4(this, vec4.create()));

  /** m_hullParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  hullParticleTextureIndex = (_init_extra_hullParticleColor4(this), _init_hullParticleTextureIndex(this, 0));

  /** m_hullParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  hullParticleVelocityStretchRotation = (_init_extra_hullParticleTextureIndex(this), _init_hullParticleVelocityStretchRotation(this, 0));

  /** m_hullParticleDrag (float) [READWRITE, PERSIST] */
  hullParticleDrag = (_init_extra_hullParticleVelocityStretchRotation(this), _init_hullParticleDrag(this, 0));

  /** m_hullParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  hullParticleTurbulenceAmplitude = (_init_extra_hullParticleDrag(this), _init_hullParticleTurbulenceAmplitude(this, 0));

  /** m_hullParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  hullParticleTurbulenceFrequency = (_init_extra_hullParticleTurbulenceAmplitude(this), _init_hullParticleTurbulenceFrequency(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericHul as EveSOFDataGenericHullDamage };
//# sourceMappingURL=EveSOFDataGenericHullDamage.js.map
