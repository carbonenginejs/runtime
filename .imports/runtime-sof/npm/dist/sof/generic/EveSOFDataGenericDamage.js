import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_armorParticleRate, _init_extra_armorParticleRate, _init_armorParticleAngle, _init_extra_armorParticleAngle, _init_armorParticleMinMaxSpeed, _init_extra_armorParticleMinMaxSpeed, _init_armorParticleMinMaxLifeTime, _init_extra_armorParticleMinMaxLifeTime, _init_armorParticleSizes, _init_extra_armorParticleSizes, _init_armorParticleColor, _init_extra_armorParticleColor, _init_armorParticleColor2, _init_extra_armorParticleColor2, _init_armorParticleColor3, _init_extra_armorParticleColor3, _init_armorParticleColor4, _init_extra_armorParticleColor4, _init_armorParticleTextureIndex, _init_extra_armorParticleTextureIndex, _init_armorParticleVelocityStretchRotation, _init_extra_armorParticleVelocityStretchRotation, _init_armorParticleDrag, _init_extra_armorParticleDrag, _init_armorParticleTurbulenceAmplitude, _init_extra_armorParticleTurbulenceAmplitude, _init_armorParticleTurbulenceFrequency, _init_extra_armorParticleTurbulenceFrequency, _init_armorParticleColorMidPoint, _init_extra_armorParticleColorMidPoint, _init_shieldGeometryResFilePath, _init_extra_shieldGeometryResFilePath, _init_flickerPerlinSpeed, _init_extra_flickerPerlinSpeed, _init_flickerPerlinAlpha, _init_extra_flickerPerlinAlpha, _init_flickerPerlinBeta, _init_extra_flickerPerlinBeta, _init_flickerPerlinN, _init_extra_flickerPerlinN, _init_armorShader, _init_extra_armorShader, _init_shieldShaderEllipsoid, _init_extra_shieldShaderEllipsoid, _init_shieldShaderHull, _init_extra_shieldShaderHull;

/** EveSOFDataGenericDamage (eve) - generated from schema shapeHash 7d59fc8f.... */
let _EveSOFDataGenericDam;
class EveSOFDataGenericDamage extends CjsModel {
  static {
    ({
      e: [_init_armorParticleRate, _init_extra_armorParticleRate, _init_armorParticleAngle, _init_extra_armorParticleAngle, _init_armorParticleMinMaxSpeed, _init_extra_armorParticleMinMaxSpeed, _init_armorParticleMinMaxLifeTime, _init_extra_armorParticleMinMaxLifeTime, _init_armorParticleSizes, _init_extra_armorParticleSizes, _init_armorParticleColor, _init_extra_armorParticleColor, _init_armorParticleColor2, _init_extra_armorParticleColor2, _init_armorParticleColor3, _init_extra_armorParticleColor3, _init_armorParticleColor4, _init_extra_armorParticleColor4, _init_armorParticleTextureIndex, _init_extra_armorParticleTextureIndex, _init_armorParticleVelocityStretchRotation, _init_extra_armorParticleVelocityStretchRotation, _init_armorParticleDrag, _init_extra_armorParticleDrag, _init_armorParticleTurbulenceAmplitude, _init_extra_armorParticleTurbulenceAmplitude, _init_armorParticleTurbulenceFrequency, _init_extra_armorParticleTurbulenceFrequency, _init_armorParticleColorMidPoint, _init_extra_armorParticleColorMidPoint, _init_shieldGeometryResFilePath, _init_extra_shieldGeometryResFilePath, _init_flickerPerlinSpeed, _init_extra_flickerPerlinSpeed, _init_flickerPerlinAlpha, _init_extra_flickerPerlinAlpha, _init_flickerPerlinBeta, _init_extra_flickerPerlinBeta, _init_flickerPerlinN, _init_extra_flickerPerlinN, _init_armorShader, _init_extra_armorShader, _init_shieldShaderEllipsoid, _init_extra_shieldShaderEllipsoid, _init_shieldShaderHull, _init_extra_shieldShaderHull],
      c: [_EveSOFDataGenericDam, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericDamage",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "armorParticleRate"], [[io, io.persist, type, type.float32], 16, "armorParticleAngle"], [[io, io.persist, type, type.vec2], 16, "armorParticleMinMaxSpeed"], [[io, io.persist, type, type.vec2], 16, "armorParticleMinMaxLifeTime"], [[io, io.persist, type, type.vec4], 16, "armorParticleSizes"], [[io, io.persist, type, type.color], 16, "armorParticleColor0"], [[io, io.persist, type, type.color], 16, "armorParticleColor1"], [[io, io.persist, type, type.color], 16, "armorParticleColor2"], [[io, io.persist, type, type.color], 16, "armorParticleColor3"], [[io, io.persist, type, type.uint32], 16, "armorParticleTextureIndex"], [[io, io.persist, type, type.float32], 16, "armorParticleVelocityStretchRotation"], [[io, io.persist, type, type.float32], 16, "armorParticleDrag"], [[io, io.persist, type, type.float32], 16, "armorParticleTurbulenceAmplitude"], [[io, io.persist, type, type.uint32], 16, "armorParticleTurbulenceFrequency"], [[io, io.persist, type, type.float32], 16, "armorParticleColorMidPoint"], [[io, io.persist, type, type.string], 16, "shieldGeometryResFilePath"], [[io, io.persist, type, type.float32], 16, "flickerPerlinSpeed"], [[io, io.persist, type, type.float32], 16, "flickerPerlinAlpha"], [[io, io.persist, type, type.float32], 16, "flickerPerlinBeta"], [[io, io.persist, type, type.int32], 16, "flickerPerlinN"], [[io, io.persist, type, type.string], 16, "armorShader"], [[io, io.persist, type, type.string], 16, "shieldShaderEllipsoid"], [[io, io.persist, type, type.string], 16, "shieldShaderHull"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shieldShaderHull(this);
  }
  /** m_armorParticleRate (float) [READWRITE, PERSIST] */
  armorParticleRate = _init_armorParticleRate(this, 0);

  /** m_armorParticleAngle (float) [READWRITE, PERSIST] */
  armorParticleAngle = (_init_extra_armorParticleRate(this), _init_armorParticleAngle(this, 0));

  /** m_armorParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  armorParticleMinMaxSpeed = (_init_extra_armorParticleAngle(this), _init_armorParticleMinMaxSpeed(this, vec2.create()));

  /** m_armorParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  armorParticleMinMaxLifeTime = (_init_extra_armorParticleMinMaxSpeed(this), _init_armorParticleMinMaxLifeTime(this, vec2.create()));

  /** m_armorParticleSizes (Vector4) [READWRITE, PERSIST] */
  armorParticleSizes = (_init_extra_armorParticleMinMaxLifeTime(this), _init_armorParticleSizes(this, vec4.create()));

  /** m_armorParticleColor0 (Color) [READWRITE, PERSIST] */
  armorParticleColor0 = (_init_extra_armorParticleSizes(this), _init_armorParticleColor(this, vec4.create()));

  /** m_armorParticleColor1 (Color) [READWRITE, PERSIST] */
  armorParticleColor1 = (_init_extra_armorParticleColor(this), _init_armorParticleColor2(this, vec4.create()));

  /** m_armorParticleColor2 (Color) [READWRITE, PERSIST] */
  armorParticleColor2 = (_init_extra_armorParticleColor2(this), _init_armorParticleColor3(this, vec4.create()));

  /** m_armorParticleColor3 (Color) [READWRITE, PERSIST] */
  armorParticleColor3 = (_init_extra_armorParticleColor3(this), _init_armorParticleColor4(this, vec4.create()));

  /** m_armorParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  armorParticleTextureIndex = (_init_extra_armorParticleColor4(this), _init_armorParticleTextureIndex(this, 0));

  /** m_armorParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  armorParticleVelocityStretchRotation = (_init_extra_armorParticleTextureIndex(this), _init_armorParticleVelocityStretchRotation(this, 0));

  /** m_armorParticleDrag (float) [READWRITE, PERSIST] */
  armorParticleDrag = (_init_extra_armorParticleVelocityStretchRotation(this), _init_armorParticleDrag(this, 0));

  /** m_armorParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  armorParticleTurbulenceAmplitude = (_init_extra_armorParticleDrag(this), _init_armorParticleTurbulenceAmplitude(this, 0));

  /** m_armorParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  armorParticleTurbulenceFrequency = (_init_extra_armorParticleTurbulenceAmplitude(this), _init_armorParticleTurbulenceFrequency(this, 1));

  /** m_armorParticleColorMidPoint (float) [READWRITE, PERSIST] */
  armorParticleColorMidPoint = (_init_extra_armorParticleTurbulenceFrequency(this), _init_armorParticleColorMidPoint(this, 0.5));

  /** m_shieldGeometryResFilePath (std::string) [READWRITE, PERSIST] */
  shieldGeometryResFilePath = (_init_extra_armorParticleColorMidPoint(this), _init_shieldGeometryResFilePath(this, ""));

  /** m_flickerPerlinSpeed (float) [READWRITE, PERSIST] */
  flickerPerlinSpeed = (_init_extra_shieldGeometryResFilePath(this), _init_flickerPerlinSpeed(this, 1));

  /** m_flickerPerlinAlpha (float) [READWRITE, PERSIST] */
  flickerPerlinAlpha = (_init_extra_flickerPerlinSpeed(this), _init_flickerPerlinAlpha(this, 1.1));

  /** m_flickerPerlinBeta (float) [READWRITE, PERSIST] */
  flickerPerlinBeta = (_init_extra_flickerPerlinAlpha(this), _init_flickerPerlinBeta(this, 2));

  /** m_flickerPerlinN (int32_t) [READWRITE, PERSIST] */
  flickerPerlinN = (_init_extra_flickerPerlinBeta(this), _init_flickerPerlinN(this, 3));

  /** m_armorShader (std::string) [READWRITE, PERSIST] */
  armorShader = (_init_extra_flickerPerlinN(this), _init_armorShader(this, ""));

  /** m_shieldShaderEllipsoid (std::string) [READWRITE, PERSIST] */
  shieldShaderEllipsoid = (_init_extra_armorShader(this), _init_shieldShaderEllipsoid(this, ""));

  /** m_shieldShaderHull (std::string) [READWRITE, PERSIST] */
  shieldShaderHull = (_init_extra_shieldShaderEllipsoid(this), _init_shieldShaderHull(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericDam as EveSOFDataGenericDamage };
//# sourceMappingURL=EveSOFDataGenericDamage.js.map
