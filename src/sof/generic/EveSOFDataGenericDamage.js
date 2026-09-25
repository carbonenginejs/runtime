// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Defines generic armor particle and color settings together with shield geometry, flicker, and shader configuration. */
@type.define({ className: "EveSOFDataGenericDamage", family: "eve" })
export class EveSOFDataGenericDamage extends CjsModel
{

  /** m_armorParticleRate (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleRate = 0;

  /** m_armorParticleAngle (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleAngle = 0;

  /** m_armorParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec2
  armorParticleMinMaxSpeed = vec2.create();

  /** m_armorParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec2
  armorParticleMinMaxLifeTime = vec2.create();

  /** m_armorParticleSizes (Vector4) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec4
  armorParticleSizes = vec4.create();

  /** m_armorParticleColor0 (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  armorParticleColor0 = vec4.create();

  /** m_armorParticleColor1 (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  armorParticleColor1 = vec4.create();

  /** m_armorParticleColor2 (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  armorParticleColor2 = vec4.create();

  /** m_armorParticleColor3 (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  armorParticleColor3 = vec4.create();

  /** m_armorParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  armorParticleTextureIndex = 0;

  /** m_armorParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleVelocityStretchRotation = 0;

  /** m_armorParticleDrag (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleDrag = 0;

  /** m_armorParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleTurbulenceAmplitude = 0;

  /** m_armorParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  armorParticleTurbulenceFrequency = 1;

  /** m_armorParticleColorMidPoint (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  armorParticleColorMidPoint = 0.5;

  /** m_shieldGeometryResFilePath (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  shieldGeometryResFilePath = "";

  /** m_flickerPerlinSpeed (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  flickerPerlinSpeed = 1;

  /** m_flickerPerlinAlpha (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  flickerPerlinAlpha = 1.1;

  /** m_flickerPerlinBeta (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  flickerPerlinBeta = 2;

  /** m_flickerPerlinN (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  flickerPerlinN = 3;

  /** m_armorShader (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  armorShader = "";

  /** m_shieldShaderEllipsoid (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  shieldShaderEllipsoid = "";

  /** m_shieldShaderHull (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  shieldShaderHull = "";

}
