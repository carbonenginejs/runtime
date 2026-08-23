// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** EveSOFDataGenericHullDamage (eve) - generated from schema shapeHash 681d5059.... */
@type.define({ className: "EveSOFDataGenericHullDamage", family: "eve" })
export class EveSOFDataGenericHullDamage extends CjsModel
{

  /** m_hullParticleRate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleRate = 0;

  /** m_hullParticleAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleAngle = 0;

  /** m_hullParticleColorMidpoint (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleColorMidpoint = 0.5;

  /** m_hullParticleInnerAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleInnerAngle = 0;

  /** m_hullParticleMinMaxSpeed (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  hullParticleMinMaxSpeed = vec2.create();

  /** m_hullParticleMinMaxLifeTime (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  hullParticleMinMaxLifeTime = vec2.create();

  /** m_hullParticleSizes (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  hullParticleSizes = vec4.create();

  /** m_hullParticleColor0 (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  hullParticleColor0 = vec4.create();

  /** m_hullParticleColor1 (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  hullParticleColor1 = vec4.create();

  /** m_hullParticleColor2 (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  hullParticleColor2 = vec4.create();

  /** m_hullParticleColor3 (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  hullParticleColor3 = vec4.create();

  /** m_hullParticleTextureIndex (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  hullParticleTextureIndex = 0;

  /** m_hullParticleVelocityStretchRotation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleVelocityStretchRotation = 0;

  /** m_hullParticleDrag (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleDrag = 0;

  /** m_hullParticleTurbulenceAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  hullParticleTurbulenceAmplitude = 0;

  /** m_hullParticleTurbulenceFrequency (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  hullParticleTurbulenceFrequency = 1;

}
