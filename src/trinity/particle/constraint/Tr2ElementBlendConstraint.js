// Source: trinity/trinity/Particle/Tr2ElementBlendConstraint.h
import { exposure as be } from "#be";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { ITr2GenericParticleConstraint } from "./ITr2GenericParticleConstraint.js";
import { vec4 } from "#math/vec4";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame. */
@be.define({
  name: "Tr2ElementBlendConstraint",
  // Tr2ElementBlendConstraint_Blue.cpp:12-39, in Carbon's order.
  interfaces: [ ITr2GenericParticleConstraint ],
  members: [
    [ be.ATTR, "isValid", be.READ ],
    [ be.ATTR_CHOOSER, "elementType", be.READWRITE | be.PERSIST | be.ENUM, "trinity.Tr2ParticleElementDeclarationName.Type" ],
    [ be.ATTR, "customName", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "value", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "originalFactor", be.READWRITE | be.PERSIST ]
  ]
})
export class Tr2ElementBlendConstraint extends ITr2GenericParticleConstraint
{

  _element = null;

  /**
   * m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Particle/Tr2ElementBlendConstraint_Blue.cpp:22); chooser Tr2ParticleElementDeclarationNameTypeChooser (trinity/trinity/Particle/Tr2ParticleElementDeclaration_Blue.cpp:6).
   */
  @type.int32
  @type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */

  @type.string
  customName = "";

  /** m_value (Vector4) [READWRITE, PERSIST] */

  @type.vec4
  value = vec4.create();

  /** m_originalFactor (float) [READWRITE, PERSIST] */

  @type.float32
  originalFactor = 1;

  /** m_isValid (bool) [READ] */
  @type.boolean
  isValid = false;

  /**
   * Resolves the target element by semantic type or custom name, marking the constraint valid only when it resolves.
   *
   * @implemented
   */

  Bind(particleSystem)
  {
    this._element = this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? particleSystem.GetElement(this.customName)
      : particleSystem.GetElement(this.elementType);
    this.isValid = !!this._element;
    return this.isValid;
  }

  /**
   * Rescales and offsets every alive particle's bound element by the configured factor and value.
   *
   * @implemented
   */

  ApplyConstraint(_arguments, buffers, strides, count, _dt)
  {
    if (!this.isValid || !this._element)
    {
      return;
    }
    const buffer = buffers[this._element.bufferIndex];
    const stride = strides[this._element.bufferIndex];
    for (let index = 0; index < count; index++)
    {
      const offset = this._element.startOffset + index * stride;
      for (let component = 0; component < this._element.dimension; component++)
      {
        buffer[offset + component] = buffer[offset + component] * this.originalFactor + this.value[component];
      }
    }
  }

  static Type = Tr2ParticleElementDeclaration.Type;

}
