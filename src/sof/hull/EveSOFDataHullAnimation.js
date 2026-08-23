// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataHullAnimation (eve) - generated from schema shapeHash 67955e12.... */
@type.define({ className: "EveSOFDataHullAnimation", family: "eve" })
export class EveSOFDataHullAnimation extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_startRotationValue (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  startRotationValue = quat.create();

  /** m_endRotationValue (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  endRotationValue = quat.create();

  /** m_startRotationTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  startRotationTime = -1;

  /** m_endRotationTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  endRotationTime = -1;

  /** m_startTranslationValue (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  startTranslationValue = vec3.create();

  /** m_endTranslationValue (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  endTranslationValue = vec3.create();

  /** m_startTranslationTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  startTranslationTime = -1;

  /** m_endTranslationTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  endTranslationTime = -1;

  /** m_id (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  id = -1;

  /** m_startRate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  startRate = -1;

  /** m_endRate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  endRate = -1;

}
