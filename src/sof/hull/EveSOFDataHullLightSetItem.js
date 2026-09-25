// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";
import { vec3 } from "#math/vec3";

/** Provides the common faction, flag, bone, position, radius, brightness, and noise fields shared by point, textured-point, and spot lights. */
@type.define({ className: "EveSOFDataHullLightSetItem", family: "eve" })
export class EveSOFDataHullLightSetItem extends CjsModel
{
  static ColorType = EveSOFDataFactionColorSet.ColorType;


  /** m_data.lightColor (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  lightColor = 0;

  /** m_data.flags (uint16_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint16
  flags = 1;

  /** m_data.boneIndex (int) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  boneIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_data.position (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_data.radius (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  radius = 0;

  /** m_data.innerRadius (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  innerRadius = 0;

  /** m_data.brightness (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  brightness = 0;

  /** m_data.noiseAmplitude (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_data.noiseFrequency (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  noiseFrequency = 1;

  /** m_data.noiseOctaves (int) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  noiseOctaves = 1;

  static LightType = Object.freeze({
    POINT_LIGHT: 0,
    TEXTURED_POINT_LIGHT: 1,
    SPOT_LIGHT: 2
  });

}
