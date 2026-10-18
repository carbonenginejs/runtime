import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementDeclaration.json.).
import { meta, type, blue } from "#schema";
import { Tr2ParticleElementDeclarationName } from "./Tr2ParticleElementDeclarationName.js";

/** Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639.... */
@blue.inherit(IRoot)
@blue.define("Tr2ParticleElementDeclaration")
export class Tr2ParticleElementDeclaration
{

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = 4;

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (Tr2ParticleElementDeclaration_Blue.cpp:45): the element name composed of
   * type and customName.
   */
  @blue.property()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  customName = "";

  /** m_dimension (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  dimension = 1;

  /** m_usedByGPU (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  usedByGPU = true;

  /** m_usageIndex (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  usageIndex = 0;

  /**
   * Returns the semantic dimension, or the authored dimension for CUSTOM elements.
   * Carbon GetSize (Tr2ParticleElementDeclaration.cpp:118-132).
   *
   * @returns {number} Two for lifetime, three for position or velocity, one for mass,
   * or the custom dimension.
   */
  @blue.method
  @meta.implemented
  GetSize()
  {
    if (this.elementType === Tr2ParticleElementDeclarationName.Type.CUSTOM)
    {
      return this.dimension;
    }
    return Tr2ParticleElementDeclaration.#sizes[this.elementType];
  }

  static #sizes = Object.freeze([2, 3, 3, 1]);

  /**
   * Returns the authored custom name for CUSTOM elements, and the semantic's
   * enum name for the built-in types.
   */
  @blue.method
  GetName()
  {
    return this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? this.customName
      : Object.keys(Tr2ParticleElementDeclaration.Type).find(name => Tr2ParticleElementDeclaration.Type[name] === this.elementType) ?? "";
  }

  static Type = Tr2ParticleElementDeclarationName.Type;

}
