// Source: trinity/trinity/Particle/Tr2RandomIntegerAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, type } from "#schema";
import { ITr2AttributeGenerator } from "./ITr2AttributeGenerator.js";
import { vec4 } from "#math/vec4";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute by sampling each component to a rounded integer within a minimum and maximum range. */
@type.define({ className: "Tr2RandomIntegerAttributeGenerator", family: "particle" })
export class Tr2RandomIntegerAttributeGenerator extends ITr2AttributeGenerator
{

  #element = null;

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  customName = "";

  /** m_maxRange (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  maxRange = vec4.create();

  /** m_minRange (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  minRange = vec4.create();

  /** m_valid (bool) [READ] */
  @io.read
  @type.boolean
  valid = false;

  /**
   * Resolves the target element by semantic type or custom name, marking the generator valid only when it resolves.
   */
  @impl.implemented
  Bind(particleSystem, boundElements)
  {
    this.#element = this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? bindParticleElement(particleSystem, this.customName, boundElements)
      : bindParticleElement(particleSystem, this.elementType, boundElements);
    this.valid = !!this.#element;
    return this.valid;
  }

  /**
   * Writes a per-component rounded random integer between the configured bounds into the particle's element slot.
   */
  @impl.adapted
  Generate(position, velocity, index)
  {
    if (!this.valid)
    {
      return;
    }
    const offset = this.#element.startOffset + index * this.#element.instanceStride;
    for (let component = 0; component < this.#element.dimension; component++)
    {
      this.#element.buffer[offset + component] = Math.floor(
        this.minRange[component]
        + Math.random() * (this.maxRange[component] - this.minRange[component])
        + 0.5
      );
    }
  }

  /**
   * The bound element's component count, or zero when unbound.
   */
  @impl.implemented
  GetDimension()
  {
    return this.valid ? this.#element.dimension : 0;
  }

  /**
   * The bound element's custom name, or its semantic type name.
   */
  @impl.implemented
  GetName()
  {
    return this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? this.customName
      : Object.keys(Tr2ParticleElementDeclaration.Type).find(name => Tr2ParticleElementDeclaration.Type[name] === this.elementType) ?? "";
  }

  static Type = Tr2ParticleElementDeclaration.Type;

}
