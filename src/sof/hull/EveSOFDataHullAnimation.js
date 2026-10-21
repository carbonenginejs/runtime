import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Identifies a hull animation and records its rotation, translation, timing, and rate endpoints. */
@be.define("EveSOFDataHullAnimation")
@blue.inherit(IRoot)
export class EveSOFDataHullAnimation
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_startRotationValue (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  startRotationValue = quat.create();

  /** m_endRotationValue (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  endRotationValue = quat.create();

  /** m_startRotationTime (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  startRotationTime = -1;

  /** m_endRotationTime (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  endRotationTime = -1;

  /** m_startTranslationValue (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  startTranslationValue = vec3.create();

  /** m_endTranslationValue (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  endTranslationValue = vec3.create();

  /** m_startTranslationTime (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  startTranslationTime = -1;

  /** m_endTranslationTime (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  endTranslationTime = -1;

  /** m_id (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  id = -1;

  /** m_startRate (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  startRate = -1;

  /** m_endRate (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  endRate = -1;

}
