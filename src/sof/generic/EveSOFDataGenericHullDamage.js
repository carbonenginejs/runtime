// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:460-483
import { meta } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Defines hull-damage particle emission, motion, turbulence, size, texture, and color settings.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 */
@meta.define({ className: "EveSOFDataGenericHullDamage", family: "eve" })
export class EveSOFDataGenericHullDamage
{

  /** m_hullParticleRate (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleRate = 0;

  /** m_hullParticleAngle (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleAngle = 0;

  /** m_hullParticleColorMidpoint (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleColorMidpoint = 0.5;

  /** m_hullParticleInnerAngle (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleInnerAngle = 0;

  /** m_hullParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  hullParticleMinMaxSpeed = vec2.create();

  /** m_hullParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  hullParticleMinMaxLifeTime = vec2.create();

  /** m_hullParticleSizes (Vector4) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  hullParticleSizes = vec4.create();

  /** m_hullParticleColor0 (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  hullParticleColor0 = vec4.create();

  /** m_hullParticleColor1 (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  hullParticleColor1 = vec4.create();

  /** m_hullParticleColor2 (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  hullParticleColor2 = vec4.create();

  /** m_hullParticleColor3 (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  hullParticleColor3 = vec4.create();

  /** m_hullParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  hullParticleTextureIndex = 0;

  /** m_hullParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleVelocityStretchRotation = 0;

  /** m_hullParticleDrag (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleDrag = 0;

  /** m_hullParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  hullParticleTurbulenceAmplitude = 0;

  /** m_hullParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  hullParticleTurbulenceFrequency = 1;

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataGenericHullDamage ],
  chainTo: null
})(EveSOFDataGenericHullDamage);
