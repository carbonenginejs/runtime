import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Particle/Tr2RandomDirectionAttributeGenerator.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { ITr2AttributeGenerator } from "./ITr2AttributeGenerator.js";
import { bindParticleElement } from "../element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** Generates a per-particle attribute as a random unit vector spanning the bound element's dimension. */
@be.define({
  name: "Tr2RandomDirectionAttributeGenerator",
  // Tr2RandomDirectionAttributeGenerator_Blue.cpp:12-25, in Carbon's order.
  interfaces: [ ITr2AttributeGenerator ],
  members: [
    [ be.PROP_RO, "name" ],
    [ be.ATTR_CHOOSER, "elementType", be.READWRITE | be.PERSIST | be.ENUM, "trinity.Tr2ParticleElementDeclarationName.Type" ],
    [ be.ATTR, "customName", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "valid", be.READ ],
    [ be.PROP_RO, "dimension" ]
  ]
})
export class Tr2RandomDirectionAttributeGenerator extends ITr2AttributeGenerator
{

  _element = null;

  /**
   * m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Particle/Tr2RandomDirectionAttributeGenerator_Blue.cpp:17); chooser Tr2ParticleElementDeclarationNameTypeChooser (trinity/trinity/Particle/Tr2ParticleElementDeclaration_Blue.cpp:6).
   */
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */

  @type.string
  customName = "";

  /** m_valid (bool) [READ] */
  @type.boolean
  valid = false;

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (Tr2RandomDirectionAttributeGenerator_Blue.cpp:16): the element name composed of type and
   * customName.
   *
   * @implemented
   */
  @type.string
  get name()
  {
    return this.GetName();
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "dimension" over GetDimension
   * (Tr2RandomDirectionAttributeGenerator_Blue.cpp:25): the bound element's dimension, or 0 when
   * unbound.
   *
   * @implemented
   */
  @type.uint32
  get dimension()
  {
    return this.GetDimension();
  }

  /**
   * Resolves the target element by semantic type or custom name, marking the generator valid only when it resolves.
   *
   * @implemented
   */

  Bind(particleSystem, boundElements)
  {
    this._element = this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? bindParticleElement(particleSystem, this.customName, boundElements)
      : bindParticleElement(particleSystem, this.elementType, boundElements);
    this.valid = !!this._element;
    return this.valid;
  }

  /**
   * Writes a random unit vector, sized to the bound element's dimension, into the particle's element slot.
   *
   * Uses the shared particle RNG with rejection-free normalize-or-fallback sampling.
   *
   * @adapted
   */

  Generate(position, velocity, index)
  {
    if (!this.valid)
    {
      return;
    }
    const dimension = this._element.dimension;
    const value = Tr2RandomDirectionAttributeGenerator._value;
    let lengthSquared = 0;
    for (let component = 0; component < dimension; component++)
    {
      value[component] = -1 + 2 * carbonRandom.particleRandFloat();
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
    const offset = this._element.startOffset + index * this._element.instanceStride;
    for (let component = 0; component < dimension; component++)
    {
      this._element.buffer[offset + component] = value[component];
    }
  }

  /**
   * The bound element's component count, or zero when unbound.
   *
   * @implemented
   */

  GetDimension()
  {
    return this.valid ? this._element.dimension : 0;
  }

  /**
   * The bound element's custom name, or its semantic type name.
   *
   * @implemented
   */

  GetName()
  {
    return this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? this.customName
      : Object.keys(Tr2ParticleElementDeclaration.Type).find(name => Tr2ParticleElementDeclaration.Type[name] === this.elementType) ?? "";
  }

  static Type = Tr2ParticleElementDeclaration.Type;

  static _value = new Float32Array(4);

}
