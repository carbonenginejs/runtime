// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2RandomUniformAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { bindParticleElement } from "./particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "./Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute by sampling each component uniformly between a minimum and maximum range. */
@type.define({ className: "Tr2RandomUniformAttributeGenerator", family: "particle" })
export class Tr2RandomUniformAttributeGenerator extends CjsModel
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
   * Writes a per-component uniformly random value between the configured bounds into the particle's element slot.
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
      this.#element.buffer[offset + component] = this.minRange[component]
        + Math.random() * (this.maxRange[component] - this.minRange[component]);
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
