import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { bindParticleElement } from '../element/particleElementBinding.js';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from '../element/Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_maxRange, _init_extra_maxRange, _init_minRange, _init_extra_minRange, _init_valid, _init_extra_valid;

/** Generates a per-particle attribute by sampling each component uniformly between a minimum and maximum range. */
let _Tr2RandomUniformAttr;
new class extends _identity {
  static [class Tr2RandomUniformAttributeGenerator extends CjsModel {
    static {
      ({
        e: [_init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_maxRange, _init_extra_maxRange, _init_minRange, _init_extra_minRange, _init_valid, _init_extra_valid, _initProto],
        c: [_Tr2RandomUniformAttr, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RandomUniformAttributeGenerator",
        family: "particle"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Type")], 16, "elementType"], [[io, io.persist, type, type.string], 16, "customName"], [[io, io.persist, type, type.vec4], 16, "maxRange"], [[io, io.persist, type, type.vec4], 16, "minRange"], [[io, io.read, type, type.boolean], 16, "valid"], [[impl, impl.implemented], 18, "Bind"], [[impl, impl.adapted], 18, "Generate"], [[impl, impl.implemented], 18, "GetDimension"], [[impl, impl.implemented], 18, "GetName"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_valid(this);
    }
    #element = (_initProto(this), null);

    /** m_name.m_type (Tr2ParticleElementDeclarationName::Type) [READWRITE, PERSIST, ENUM] */
    elementType = _init_elementType(this, _Tr2ParticleElementDe.Type.CUSTOM);

    /** m_name.m_name (std::string) [READWRITE, PERSIST] */
    customName = (_init_extra_elementType(this), _init_customName(this, ""));

    /** m_maxRange (Vector4) [READWRITE, PERSIST] */
    maxRange = (_init_extra_customName(this), _init_maxRange(this, vec4.create()));

    /** m_minRange (Vector4) [READWRITE, PERSIST] */
    minRange = (_init_extra_maxRange(this), _init_minRange(this, vec4.create()));

    /** m_valid (bool) [READ] */
    valid = (_init_extra_minRange(this), _init_valid(this, false));

    /**
     * Resolves the target element by semantic type or custom name, marking the generator valid only when it resolves.
     */
    Bind(particleSystem, boundElements) {
      this.#element = this.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? bindParticleElement(particleSystem, this.customName, boundElements) : bindParticleElement(particleSystem, this.elementType, boundElements);
      this.valid = !!this.#element;
      return this.valid;
    }

    /**
     * Writes a per-component uniformly random value between the configured bounds into the particle's element slot.
     */
    Generate(position, velocity, index) {
      if (!this.valid) {
        return;
      }
      const offset = this.#element.startOffset + index * this.#element.instanceStride;
      for (let component = 0; component < this.#element.dimension; component++) {
        this.#element.buffer[offset + component] = this.minRange[component] + Math.random() * (this.maxRange[component] - this.minRange[component]);
      }
    }

    /**
     * The bound element's component count, or zero when unbound.
     */
    GetDimension() {
      return this.valid ? this.#element.dimension : 0;
    }

    /**
     * The bound element's custom name, or its semantic type name.
     */
    GetName() {
      return this.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? this.customName : Object.keys(_Tr2ParticleElementDe.Type).find(name => _Tr2ParticleElementDe.Type[name] === this.elementType) ?? "";
    }
  }];
  Type = _Tr2ParticleElementDe.Type;
  constructor() {
    super(_Tr2RandomUniformAttr), _initClass();
  }
}();

export { _Tr2RandomUniformAttr as Tr2RandomUniformAttributeGenerator };
//# sourceMappingURL=Tr2RandomUniformAttributeGenerator.js.map
