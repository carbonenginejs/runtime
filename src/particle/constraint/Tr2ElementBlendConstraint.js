// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Particle/Tr2ElementBlendConstraint.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

/** A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame. */
@type.define({ className: "Tr2ElementBlendConstraint", family: "particle" })
export class Tr2ElementBlendConstraint extends CjsModel
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

  /** m_value (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  value = vec4.create();

  /** m_originalFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  originalFactor = 1;

  /** m_isValid (bool) [READ] */
  @io.read
  @type.boolean
  isValid = false;

  /**
   * Resolves the target element by semantic type or custom name, marking the constraint valid only when it resolves.
   */
  @impl.implemented
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
  @impl.implemented
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
