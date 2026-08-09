// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementDeclarationName.json).
import { schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2ParticleElementDeclarationName (particle) - generated from schema shapeHash 115c80e5.... */
@type.define({ className: "Tr2ParticleElementDeclarationName", family: "particle" })
export class Tr2ParticleElementDeclarationName extends CjsModel
{

  /** m_type (Type - enum Type) */
  @type.int32
  @schema.enum("Type")
  type = 0;

  /** m_name (std::string) */
  @type.string
  name = "";

  /** Carbon operator== - CUSTOM elements also compare their names. */
  Equals(other)
  {
    if (this.type !== other?.type)
    {
      return false;
    }
    return this.type !== Tr2ParticleElementDeclarationName.Type.CUSTOM || this.name === other.name;
  }

  /** Carbon operator< - map-key ordering (type, then name for CUSTOM pairs). */
  Compare(other)
  {
    if (this.type < other.type)
    {
      return true;
    }
    return this.type === Tr2ParticleElementDeclarationName.Type.CUSTOM &&
      other.type === Tr2ParticleElementDeclarationName.Type.CUSTOM &&
      this.name < other.name;
  }

  /** Carbon GetName - human-readable name; CUSTOM returns the custom name. */
  GetName()
  {
    if (this.type >= Tr2ParticleElementDeclarationName.Type.CUSTOM)
    {
      return this.name;
    }
    return Tr2ParticleElementDeclarationName.#typeNames[this.type];
  }

  /**
   * Carbon GetD3DUsage - vertex usage code for this particle element
   * (LIFETIME->TANGENT, POSITION->POSITION, VELOCITY->NORMAL,
   * MASS->BITANGENT, CUSTOM->TEXCOORD).
   */
  GetD3DUsage()
  {
    return Tr2ParticleElementDeclarationName.#usageCodes[this.type];
  }

  static #typeNames = Object.freeze(["LIFETIME", "POSITION", "VELOCITY", "MASS"]);

  /** Tr2VertexDefinition::UsageCode values (shared with Tr2RuntimeInstanceData.UsageCode). */
  static #usageCodes = Object.freeze([3, 0, 2, 4, 5]);

  static Type = Object.freeze({
    LIFETIME: 0,
    POSITION: 1,
    VELOCITY: 2,
    MASS: 3,
    CUSTOM: 4,
  });

}
