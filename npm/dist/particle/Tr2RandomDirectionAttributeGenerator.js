import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { bindParticleElement } from './particleElementBinding.js';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from './Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_valid, _init_extra_valid;

/** Generates a per-particle attribute as a random unit vector spanning the bound element's dimension. */
let _Tr2RandomDirectionAt;
new class extends _identity {
  static [class Tr2RandomDirectionAttributeGenerator extends CjsModel {
    static {
      ({
        e: [_init_elementType, _init_extra_elementType, _init_customName, _init_extra_customName, _init_valid, _init_extra_valid, _initProto],
        c: [_Tr2RandomDirectionAt, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RandomDirectionAttributeGenerator",
        family: "particle"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Type")], 16, "elementType"], [[io, io.persist, type, type.string], 16, "customName"], [[io, io.read, type, type.boolean], 16, "valid"], [[impl, impl.implemented], 18, "Bind"], [[impl, impl.adapted, void 0, impl.reason("Carbon's particle RNG is replaced by Math.random while retaining its rejection-free normalize-or-fallback sampling.")], 18, "Generate"], [[impl, impl.implemented], 18, "GetDimension"], [[impl, impl.implemented], 18, "GetName"]], 0, void 0, CjsModel));
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

    /** m_valid (bool) [READ] */
    valid = (_init_extra_customName(this), _init_valid(this, false));

    /**
     * Resolves the target element by semantic type or custom name, marking the generator valid only when it resolves.
     */
    Bind(particleSystem, boundElements) {
      this.#element = this.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? bindParticleElement(particleSystem, this.customName, boundElements) : bindParticleElement(particleSystem, this.elementType, boundElements);
      this.valid = !!this.#element;
      return this.valid;
    }

    /**
     * Writes a random unit vector, sized to the bound element's dimension, into the particle's element slot.
     */
    Generate(position, velocity, index) {
      if (!this.valid) {
        return;
      }
      const dimension = this.#element.dimension;
      const value = _Tr2RandomDirectionAt.#value;
      let lengthSquared = 0;
      for (let component = 0; component < dimension; component++) {
        value[component] = -1 + 2 * Math.random();
        lengthSquared += value[component] * value[component];
      }
      if (lengthSquared === 0) {
        value[0] = 1;
      } else {
        const inverseLength = 1 / Math.sqrt(lengthSquared);
        for (let component = 0; component < dimension; component++) {
          value[component] *= inverseLength;
        }
      }
      const offset = this.#element.startOffset + index * this.#element.instanceStride;
      for (let component = 0; component < dimension; component++) {
        this.#element.buffer[offset + component] = value[component];
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
  #value = new Float32Array(4);
  constructor() {
    super(_Tr2RandomDirectionAt), _initClass();
  }
}();

export { _Tr2RandomDirectionAt as Tr2RandomDirectionAttributeGenerator };
//# sourceMappingURL=Tr2RandomDirectionAttributeGenerator.js.map
