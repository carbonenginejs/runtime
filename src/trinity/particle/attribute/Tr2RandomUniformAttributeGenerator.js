import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Particle/Tr2RandomUniformAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ITr2AttributeGenerator } from "./ITr2AttributeGenerator.js";
import { vec4 } from "#math/vec4";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute by sampling each component uniformly between a minimum and maximum range. */
@be.mapInterface(ITr2AttributeGenerator)
@be.define("Tr2RandomUniformAttributeGenerator")
export class Tr2RandomUniformAttributeGenerator extends ITr2AttributeGenerator
{

  #element = null;

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  customName = "";

  /** m_maxRange (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  maxRange = vec4.create();

  /** m_minRange (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  minRange = vec4.create();

  /** m_valid (bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  valid = false;

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (Tr2RandomUniformAttributeGenerator_Blue.cpp:16): the element name composed of type and
   * customName.
   */
  @be.mapPropertyReadOnly()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "dimension" over GetDimension
   * (Tr2RandomUniformAttributeGenerator_Blue.cpp:27): the bound element's dimension, or 0 when
   * unbound.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get dimension()
  {
    return this.GetDimension();
  }

  /**
   * Resolves the target element by semantic type or custom name, marking the generator valid only when it resolves.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
        + carbonRandom.particleRandFloat() * (this.maxRange[component] - this.minRange[component]);
    }
  }

  /**
   * The bound element's component count, or zero when unbound.
   */
  @blue.method
  @meta.implemented
  GetDimension()
  {
    return this.valid ? this.#element.dimension : 0;
  }

  /**
   * The bound element's custom name, or its semantic type name.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? this.customName
      : Object.keys(Tr2ParticleElementDeclaration.Type).find(name => Tr2ParticleElementDeclaration.Type[name] === this.elementType) ?? "";
  }

  static Type = Tr2ParticleElementDeclaration.Type;

}
