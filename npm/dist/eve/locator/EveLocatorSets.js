import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Locator as _Locator } from './Locator.js';

let _initProto, _initClass, _init_locators, _init_extra_locators, _init_name, _init_extra_name;
let _EveLocatorSets;
new class extends _identity {
  static [class EveLocatorSets extends CjsModel {
    static {
      ({
        e: [_init_locators, _init_extra_locators, _init_name, _init_extra_name, _initProto],
        c: [_EveLocatorSets, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveLocatorSets",
        family: "eve/utils"
      })], [[[io, io.persist, void 0, type.list("Locator")], 16, "locators"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "Translate"], [[carbon, carbon.method, impl, impl.adapted], 18, "Append"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Set"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetLocator"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    locators = (_initProto(this), _init_locators(this, []));
    name = (_init_extra_locators(this), _init_name(this, ""));
    Translate(offset) {
      if (_EveLocatorSets.#lengthSq(offset) === 0) {
        return;
      }
      for (const locator of this.locators) {
        vec3.add(locator.position, locator.position, offset);
      }
    }
    Append(locators) {
      for (const locator of locators) {
        this.locators.push(_Locator.from(locator));
      }
    }
    HasName(name) {
      return this.name === String(name);
    }
    GetLocators() {
      return this.locators;
    }
    GetName() {
      return this.name;
    }
    SetName(name) {
      this.name = String(name);
    }
    Set(name, locators) {
      this.SetName(name);
      this.locators = locators.map(locator => _Locator.from(locator));
    }
    SetLocator(index, value) {
      const existing = this.locators[index];
      if (existing) {
        existing.SetValues({
          position: value.position,
          direction: value.direction,
          scale: value.scale ?? [0, 0, 0],
          boneIndex: value.boneIndex ?? 0
        });
      }
    }
  }];
  #lengthSq(value) {
    return value[0] * value[0] + value[1] * value[1] + value[2] * value[2];
  }
  constructor() {
    super(_EveLocatorSets), _initClass();
  }
}();

export { _EveLocatorSets as EveLocatorSets };
//# sourceMappingURL=EveLocatorSets.js.map
