// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2RandomDirectionAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute as a random unit vector spanning the bound element's dimension. */
@type.define({ className: "Tr2RandomDirectionAttributeGenerator", family: "particle" })
export class Tr2RandomDirectionAttributeGenerator extends CjsModel
{

  #element = null;

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @schema.enum("Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  customName = "";

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
   * Writes a random unit vector, sized to the bound element's dimension, into the particle's element slot.
   */
  @impl.adapted
  @impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its rejection-free normalize-or-fallback sampling.")
  Generate(position, velocity, index)
  {
    if (!this.valid)
    {
      return;
    }
    const dimension = this.#element.dimension;
    const value = Tr2RandomDirectionAttributeGenerator.#value;
    let lengthSquared = 0;
    for (let component = 0; component < dimension; component++)
    {
      value[component] = -1 + 2 * Math.random();
      lengthSquared += value[component] * value[component];
    }
    if (lengthSquared === 0)
    {
      value[0] = 1;
    }
    else
    {
      const inverseLength = 1 / Math.sqrt(lengthSquared);
      for (let component = 0; component < dimension; component++)
      {
        value[component] *= inverseLength;
      }
    }
    const offset = this.#element.startOffset + index * this.#element.instanceStride;
    for (let component = 0; component < dimension; component++)
    {
      this.#element.buffer[offset + component] = value[component];
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

  static #value = new Float32Array(4);

}
