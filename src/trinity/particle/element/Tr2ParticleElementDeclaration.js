// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementDeclaration.json.).
import { carbon, edit, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2ParticleElementDeclarationName } from "./Tr2ParticleElementDeclarationName.js";

/** Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639.... */
@type.define({ className: "Tr2ParticleElementDeclaration", family: "particle" })
export class Tr2ParticleElementDeclaration extends CjsModel
{

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = 4;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  customName = "";

  /** m_dimension (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  dimension = 1;

  /** m_usedByGPU (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  usedByGPU = true;

  /** m_usageIndex (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  usageIndex = 0;

  /**
   * Returns the native semantic size (2 for lifetime, 3 for position and
   * velocity, 1 for mass) or, for CUSTOM elements, the authored `dimension`
   * unclamped. Tr2ParticleSystem lays out its element buffers from this value.
   */
  @carbon.method
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
  GetName()
  {
    return this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? this.customName
      : Object.keys(Tr2ParticleElementDeclaration.Type).find(name => Tr2ParticleElementDeclaration.Type[name] === this.elementType) ?? "";
  }

  static Type = Tr2ParticleElementDeclarationName.Type;

}
