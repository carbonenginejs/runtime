import { exposure as be } from "#be";
// Source: trinity/trinity/Particle/Tr2ConsecutiveIntegerAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ITr2AttributeGenerator } from "./ITr2AttributeGenerator.js";
import { vec4 } from "#math/vec4";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute as a cycling, wrapped incrementing integer counter within a range. */
@be.mapInterface(ITr2AttributeGenerator)
@be.define("Tr2ConsecutiveIntegerAttributeGenerator")
export class Tr2ConsecutiveIntegerAttributeGenerator extends ITr2AttributeGenerator
{

  #currentValues = new Uint32Array(4);

  #element = null;

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  customName = "";

  /** m_maxRange (Vector4) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec4
  maxRange = vec4.create();

  /** m_minRange (Vector4) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec4
  minRange = vec4.create();

  /** m_valid (bool) [READ] */
  @blue.read
  @type.boolean
  valid = false;

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (Tr2ConsecutiveIntegerAttributeGenerator_Blue.cpp:16): the element name composed of type and
   * customName.
   */
  @blue.property()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "dimension" over GetDimension
   * (Tr2ConsecutiveIntegerAttributeGenerator_Blue.cpp:27): the bound element's dimension, or 0 when
   * unbound.
   */
  @blue.property()
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
   * Advances and wraps a per-component running counter and writes it into the particle's element slot.
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
      this.#currentValues[component]++;
      const range = Math.max(0, Math.trunc(this.maxRange[component] - this.minRange[component]));
      this.#element.buffer[offset + component] = range
        ? this.minRange[component] + this.#currentValues[component] % range
        : this.minRange[component];
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
