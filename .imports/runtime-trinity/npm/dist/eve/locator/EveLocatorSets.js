import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Locator as _Locator } from './Locator.js';

let _initProto, _initClass, _init_locators, _init_extra_locators, _init_name, _init_extra_name;

/**
 * Named group of locators that a space object publishes for turrets, effects and
 * distributions to attach to.
 */
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

    /**
     * Shifts the position of every locator in the set by an offset, doing nothing
     * for a zero offset.
     */
    Translate(offset) {
      if (_EveLocatorSets.#lengthSq(offset) === 0) {
        return;
      }
      for (const locator of this.locators) {
        vec3.add(locator.position, locator.position, offset);
      }
    }

    /**
     * Appends copies of the given locators, so the set never aliases the caller's
     * records.
     */
    Append(locators) {
      for (const locator of locators) {
        this.locators.push(_Locator.from(locator));
      }
    }

    /**
     * Reports whether the set carries exactly this name; set lookups are an exact
     * string match.
     */
    HasName(name) {
      return this.name === String(name);
    }

    /** Returns the set's live locator list, not a copy. */
    GetLocators() {
      return this.locators;
    }

    /** Returns the name callers look this set up by. */
    GetName() {
      return this.name;
    }

    /** Sets the name callers look this set up by, coercing the value to a string. */
    SetName(name) {
      this.name = String(name);
    }

    /**
     * Replaces both the set name and its whole locator list with copies of the
     * given locators.
     */
    Set(name, locators) {
      this.SetName(name);
      this.locators = locators.map(locator => _Locator.from(locator));
    }

    /**
     * Overwrites the locator at an index from a plain value, defaulting a missing
     * scale to zero and a missing bone index to 0; an index outside the list is
     * ignored.
     */
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

    /**
     * Squared length of a three-component value, used to test an offset for being
     * zero without a square root.
     */
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
