// Source: trinity/trinity/Particle/Tr2ElementBlendConstraint.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { ITr2GenericParticleConstraint } from "./ITr2GenericParticleConstraint.js";
import { vec4 } from "#math/vec4";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame. */
@meta.define({ className: "Tr2ElementBlendConstraint", family: "particle" })
export class Tr2ElementBlendConstraint extends ITr2GenericParticleConstraint
{

  #element = null;

  /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2ParticleElementDeclarationName.Type")
  elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;

  /** m_name.m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  customName = "";

  /** m_value (Vector4) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  value = vec4.create();

  /** m_originalFactor (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  originalFactor = 1;

  /** m_isValid (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  isValid = false;

  /**
   * Resolves the target element by semantic type or custom name, marking the constraint valid only when it resolves.
   */
  @meta.implemented
  Bind(particleSystem)
  {
    this.#element = this.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
      ? particleSystem?.GetElement?.(this.customName)
      : particleSystem?.GetElement?.(this.elementType);
    this.isValid = !!this.#element;
    return this.isValid;
  }

  /**
   * Rescales and offsets every alive particle's bound element by the configured factor and value.
   */
  @meta.implemented
  ApplyConstraint(buffers, strides, count)
  {
    if (!this.isValid || !this.#element)
    {
      return;
    }
    const buffer = buffers[this.#element.bufferIndex];
    const stride = strides[this.#element.bufferIndex];
    for (let index = 0; index < count; index++)
    {
      const offset = this.#element.startOffset + index * stride;
      for (let component = 0; component < this.#element.dimension; component++)
      {
        buffer[offset + component] = buffer[offset + component] * this.originalFactor + this.value[component];
      }
    }
  }

  static Type = Tr2ParticleElementDeclaration.Type;

}
