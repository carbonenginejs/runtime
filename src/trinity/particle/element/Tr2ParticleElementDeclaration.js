// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementDeclaration.json.).
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2ParticleElementDeclaration (particle) - generated from schema shapeHash 272e6639.... */
@type.define({ className: "Tr2ParticleElementDeclaration", family: "particle" })
export class Tr2ParticleElementDeclaration extends CjsModel
{

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Type")
  elementType = 4;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  customName = "";

  /** m_dimension (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  dimension = 1;

  /** m_usedByGPU (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  usedByGPU = true;

  /** m_usageIndex (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  usageIndex = 0;

  /** Returns Carbon's fixed dimensions for built-in particle semantics. */
  GetDimension()
  {
    switch (this.elementType)
    {
      case Tr2ParticleElementDeclaration.Type.LIFETIME:
        return 2;
      case Tr2ParticleElementDeclaration.Type.POSITION:
      case Tr2ParticleElementDeclaration.Type.VELOCITY:
        return 3;
      case Tr2ParticleElementDeclaration.Type.MASS:
        return 1;
      default:
        return Math.max(1, Math.min(4, Math.trunc(this.dimension) || 1));
    }
  }

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

  static Type = Object.freeze({
    LIFETIME: 0,
    POSITION: 1,
    VELOCITY: 2,
    MASS: 3,
    CUSTOM: 4,
  });

}
