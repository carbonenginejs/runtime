// Source: trinity/trinity/Particle/Tr2ParticleElementDeclaration.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema particle/Tr2ParticleElementDeclarationName.json).
import { type, blue, meta } from "#schema";
import { blue as be, EnumRegistrationType } from "#blue";

/** Tr2ParticleElementDeclarationName (particle) - generated from schema shapeHash 115c80e5.... */
@meta.carbon("Tr2ParticleElementDeclarationName")
export class Tr2ParticleElementDeclarationName
{

  /** m_type (Type - enum Type) */
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  type = 0;

  /** m_name (std::string) */
  @type.string
  name = "";

  /**
   * Carbon Tr2ParticleElementDeclarationName( Type type )
   * (Tr2ParticleElementDeclaration.cpp:12-15); the name stays empty.
   * @param {number} type A Tr2ParticleElementDeclarationName.Type value.
   * @returns {Tr2ParticleElementDeclarationName}
   */
  static create__Type(type)
  {
    const out = new Tr2ParticleElementDeclarationName();
    out.type = type;
    return out;
  }

  /**
   * Carbon Tr2ParticleElementDeclarationName( Type type, std::string name )
   * (Tr2ParticleElementDeclaration.cpp:24-28).
   * @param {number} type A Tr2ParticleElementDeclarationName.Type value.
   * @param {string} name The custom name (used when type is CUSTOM).
   * @returns {Tr2ParticleElementDeclarationName}
   */
  static create__TypeName(type, name)
  {
    const out = new Tr2ParticleElementDeclarationName();
    out.type = type;
    out.name = name;
    return out;
  }

  /** Carbon operator== - CUSTOM elements also compare their names. */
  @meta.renamed("operator==")
  Equals(other)
  {
    if (this.type !== other.type)
    {
      return false;
    }
    return this.type !== Tr2ParticleElementDeclarationName.Type.CUSTOM || this.name === other.name;
  }

  /** Carbon operator< - map-key ordering (type, then name for CUSTOM pairs). */
  @meta.renamed("operator<")
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
  @blue.method
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
  @blue.method
  GetD3DUsage()
  {
    return Tr2ParticleElementDeclarationName.#usageCodes[this.type];
  }

  static #typeNames = Object.freeze(["LIFETIME", "POSITION", "VELOCITY", "MASS"]);

  /** Tr2VertexDefinition::UsageCode values (shared with Tr2RuntimeInstanceData.UsageCode). */
  static #usageCodes = Object.freeze([3, 0, 2, 4, 5]);

  static Type = {
    LIFETIME: 0,
    POSITION: 1,
    VELOCITY: 2,
    MASS: 3,
    CUSTOM: 4,
  };

}


be.enums.Create("trinity.Tr2ParticleElementDeclarationName.Type", Tr2ParticleElementDeclarationName.Type, {
  exposedName: "PARTICLE_ELEMENT_TYPE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "LIFETIME", value: Tr2ParticleElementDeclarationName.Type.LIFETIME, description: "Particle life time (2D float)" },
    { name: "POSITION", value: Tr2ParticleElementDeclarationName.Type.POSITION, description: "Particle position (3D vector)" },
    { name: "VELOCITY", value: Tr2ParticleElementDeclarationName.Type.VELOCITY, description: "Particle velocity (3D vector)" },
    { name: "MASS", value: Tr2ParticleElementDeclarationName.Type.MASS, description: "Particle mass (1D float)" },
    { name: "CUSTOM", value: Tr2ParticleElementDeclarationName.Type.CUSTOM, description: "Custom data" }
  ]
});
