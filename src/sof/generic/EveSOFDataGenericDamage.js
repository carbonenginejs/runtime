import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:428-457
import { type, blue } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Defines generic armor particle and color settings together with shield geometry, flicker, and shader configuration.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 * Shader and geometry paths are authored strings, not held resources.
 */
@be.define("EveSOFDataGenericDamage")
@blue.inherit(IRoot)

export class EveSOFDataGenericDamage
{

  /** m_flickerPerlinSpeed (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  flickerPerlinSpeed = 1;

  /** m_flickerPerlinAlpha (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  flickerPerlinAlpha = 1.1;

  /** m_flickerPerlinBeta (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  flickerPerlinBeta = 2;

  /** m_flickerPerlinN (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  flickerPerlinN = 3;

  /** m_armorParticleRate (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleRate = 0;

  /** m_armorParticleAngle (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleAngle = 0;

  /** m_armorParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  armorParticleMinMaxSpeed = vec2.create();

  /** m_armorParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  armorParticleMinMaxLifeTime = vec2.create();

  /** m_armorParticleSizes (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  armorParticleSizes = vec4.create();

  /** m_armorParticleColor0 (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  armorParticleColor0 = vec4.create();

  /** m_armorParticleColor1 (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  armorParticleColor1 = vec4.create();

  /** m_armorParticleColor2 (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  armorParticleColor2 = vec4.create();

  /** m_armorParticleColor3 (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  armorParticleColor3 = vec4.create();

  /** m_armorParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  armorParticleTextureIndex = 0;

  /** m_armorParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleVelocityStretchRotation = 0;

  /** m_armorParticleDrag (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleDrag = 0;

  /** m_armorParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleTurbulenceAmplitude = 0;

  /** m_armorParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  armorParticleTurbulenceFrequency = 1;

  /** m_armorParticleColorMidPoint (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  armorParticleColorMidPoint = 0.5;

  /** m_armorShader (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  armorShader = "";

  /** m_shieldShaderEllipsoid (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shieldShaderEllipsoid = "";

  /** m_shieldShaderHull (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shieldShaderHull = "";

  /** m_shieldGeometryResFilePath (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriGeometryRes")
  shieldGeometryResFilePath = "";

}

