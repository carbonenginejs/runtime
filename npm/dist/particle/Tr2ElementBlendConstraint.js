import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from './Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_value, _init_extra_value, _init_originalFactor, _init_extra_originalFactor, _init_isValid, _init_extra_isValid;

/** A constraint that rescales and offsets a single bound particle element by a constant factor and value each frame. */
let _Tr2ElementBlendConst;
new class extends _identity {
  static [class Tr2ElementBlendConstraint extends CjsModel {
    static {
      ({
        e: [_init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_value, _init_extra_value, _init_originalFactor, _init_extra_originalFactor, _init_isValid, _init_extra_isValid, _initProto],
        c: [_Tr2ElementBlendConst, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ElementBlendConstraint",
        family: "particle"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Type")], 16, "elementType"], [[io, io.persist, type, type.string], 16, "customName"], [[io, io.persist, type, type.vec4], 16, "value"], [[io, io.persist, type, type.float32], 16, "originalFactor"], [[io, io.read, type, type.boolean], 16, "isValid"], [[impl, impl.implemented], 18, "Bind"], [[impl, impl.implemented], 18, "ApplyConstraint"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isValid(this);
    }
    #element = (_initProto(this), null);

    /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
    elementType = _init_elementType(this, _Tr2ParticleElementDe.Type.CUSTOM);

    /** m_name.m_name (std::string) [READWRITE, PERSIST] */
    customName = (_init_extra_elementType(this), _init_customName(this, ""));

    /** m_value (Vector4) [READWRITE, PERSIST] */
    value = (_init_extra_customName(this), _init_value(this, vec4.create()));

    /** m_originalFactor (float) [READWRITE, PERSIST] */
    originalFactor = (_init_extra_value(this), _init_originalFactor(this, 1));

    /** m_isValid (bool) [READ] */
    isValid = (_init_extra_originalFactor(this), _init_isValid(this, false));

    /**
     * Resolves the target element by semantic type or custom name, marking the constraint valid only when it resolves.
     */
    Bind(particleSystem) {
      this.#element = this.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? particleSystem?.GetElement?.(this.customName) : particleSystem?.GetElement?.(this.elementType);
      this.isValid = !!this.#element;
      return this.isValid;
    }

    /**
     * Rescales and offsets every alive particle's bound element by the configured factor and value.
     */
    ApplyConstraint(buffers, strides, count) {
      if (!this.isValid || !this.#element) {
        return;
      }
      const buffer = buffers[this.#element.bufferIndex];
      const stride = strides[this.#element.bufferIndex];
      for (let index = 0; index < count; index++) {
        const offset = this.#element.startOffset + index * stride;
        for (let component = 0; component < this.#element.dimension; component++) {
          buffer[offset + component] = buffer[offset + component] * this.originalFactor + this.value[component];
        }
      }
    }
  }];
  Type = _Tr2ParticleElementDe.Type;
  constructor() {
    super(_Tr2ElementBlendConst), _initClass();
  }
}();

export { _Tr2ElementBlendConst as Tr2ElementBlendConstraint };
//# sourceMappingURL=Tr2ElementBlendConstraint.js.map
