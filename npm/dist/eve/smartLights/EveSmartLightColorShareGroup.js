import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../EveEntity.js';
import { resolveGroupColor } from './EveSmartLightBaseGroup.js';
import { PlacementDataWithIdentifier as _PlacementDataWithIde } from '../PlacementDataWithIdentifier.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lightGroups, _init_extra_lightGroups, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor;

/** A smart-light group that computes one shared faction-aware colour, applies it to its child light groups, and fans out their per-frame updates. */
let _EveSmartLightColorSh;
new class extends _identity {
  static [class EveSmartLightColorShareGroup extends _EveEntity {
    static {
      ({
        e: [_init_display, _init_extra_display, _init_name, _init_extra_name, _init_lightGroups, _init_extra_lightGroups, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor, _initProto],
        c: [_EveSmartLightColorSh, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightColorShareGroup",
        family: "eve/smartLights"
      })], [[[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, void 0, type.list("IEveSmartLightGroup")], 16, "lightGroups"], [[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.color], 16, "customColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface through the shared resolveGroupColor helper.")], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")], 18, "SetColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The settle hook receives no changed-property list; the display edit is detected by comparing the cached last-applied value.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("List events carry no BELIST insert/remove mask; inserted values (or, absent one, the whole list) are re-fanned idempotently, and registry wiring re-registers this entity rather than the individual group.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddQuadsToQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RenderDebugInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"]], 0, void 0, _EveEntity));
    }
    /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
    display = (_initProto(this), _init_display(this, true));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_display(this), _init_name(this, ""));

    /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST, NOTIFY] */
    lightGroups = (_init_extra_name(this), _init_lightGroups(this, []));

    // Flattened EveSmartLightBaseGroup secondary base (Carbon multiple
    // inheritance; EveSmartLightBaseGroup_Blue.cpp:15-20 - the wire format of
    // this class carries these fields).

    /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] (EveSmartLightBaseGroup.h:31) */
    factionColor = (_init_extra_lightGroups(this), _init_factionColor(this, -1));

    /** m_useFactionColor (bool) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:32) */
    useFactionColor = (_init_extra_factionColor(this), _init_useFactionColor(this, false));

    /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] (EveSmartLightBaseGroup.h:29) */
    attributeModifiers = (_init_extra_useFactionColor(this), _init_attributeModifiers(this, []));

    /** m_color (Color) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:30) */
    customColor = (_init_extra_attributeModifiers(this), _init_customColor(this, vec4.createLinear()));

    /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
    #parentColorSet = (_init_extra_customColor(this), null);

    /** Last `display` value the settle hook applied (JS-only change detection). */
    #lastAppliedDisplay = true;

    /** Faction-aware group color (Carbon base EveSmartLightBaseGroup.cpp:43-53). */
    GetGroupColor() {
      return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet);
    }

    /** Overwrites the custom color (Carbon base EveSmartLightBaseGroup.cpp:55-58). */
    SetColor(color) {
      vec4.copy(this.customColor, color);
    }

    /** display edits re-register the shared groups (EveSmartLightColorShareGroup.cpp:17-24). */
    OnModified(_options = {}) {
      if (this.display !== this.#lastAppliedDisplay) {
        this.#lastAppliedDisplay = this.display;
        this.ReRegister();
      }
      return true;
    }

    /**
     * Inserted attribute modifiers and light groups inherit the current color
     * set; inserted light groups register while this entity is registered
     * (EveSmartLightColorShareGroup.cpp:26-82).
     */
    OnListModified(_event, _key, _key2, value, list) {
      if (this.#parentColorSet && (list === this.attributeModifiers || list === this.lightGroups)) {
        if (value) {
          value.SetInheritProperties?.(this.#parentColorSet);
        } else {
          for (const entry of list) {
            entry?.SetInheritProperties?.(this.#parentColorSet);
          }
        }
      }
      if (list === this.lightGroups && this.IsInRegistry()) {
        this.ReRegister();
      }
    }

    /** Registers the shared groups while displayed (EveSmartLightColorShareGroup.cpp:84-97). */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        for (const group of this.lightGroups) {
          group?.Register?.(registry);
        }
      }
    }

    /** Unregisters the shared groups (EveSmartLightColorShareGroup.cpp:99-112). */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const group of this.lightGroups) {
          group?.UnRegister?.(registry);
        }
      }
    }

    /** Quad fan-out, gated on display (EveSmartLightColorShareGroup.cpp:114-125). */
    AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer) {
      if (!this.display) {
        return;
      }
      for (const group of this.lightGroups) {
        group?.AddQuadsToQuadRenderer?.(placements, size, frustum, quadRenderer);
      }
    }

    /** Renderable fan-out, gated on display (EveSmartLightColorShareGroup.cpp:127-138). */
    GetRenderables(renderables = []) {
      if (!this.display) {
        return renderables;
      }
      for (const group of this.lightGroups) {
        group?.GetRenderables?.(renderables);
      }
      return renderables;
    }

    /**
     * Updates the shared groups, then the group's own attribute modifiers with
     * full strength (EveSmartLightColorShareGroup.cpp:140-151).
     */
    UpdateSyncronous(updateContext, params, distribution) {
      for (const group of this.lightGroups) {
        group?.UpdateSyncronous?.(updateContext, params, distribution);
      }
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.UpdateSyncronous?.(updateContext, params, 1);
      }
    }

    /**
     * Runs the shared attribute modifiers once over the group color (default
     * placement key, up direction), then pushes the shared color into every
     * child group before their asynchronous update
     * (EveSmartLightColorShareGroup.cpp:153-168).
     */
    UpdateAsyncronous(updateContext, params, distribution) {
      const statics = _EveSmartLightColorSh;
      const groupColor = this.GetGroupColor();
      const colorValues = statics.#colorValues;
      vec3.set(colorValues, groupColor[0], groupColor[1], groupColor[2]);
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.ProcessAttributeModifier?.(colorValues, statics.#defaultPlacement, statics.#defaultPlacement.initialTranslation, statics.#up, params?.activationStrength ?? 1);
      }
      const sharedColor = statics.#sharedColor;
      vec4.set(sharedColor, colorValues[0], colorValues[1], colorValues[2], this.customColor[3]);
      for (const group of this.lightGroups) {
        group?.SetColor?.(sharedColor);
        group?.UpdateAsyncronous?.(updateContext, params, distribution);
      }
    }

    /**
     * Fans a controller variable to the group's own modifiers, then to the
     * shared groups (EveSmartLightColorShareGroup.cpp:170-178).
     */
    SetControllerVariable(name, value) {
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.SetControllerVariable?.(name, value);
      }
      for (const group of this.lightGroups) {
        group?.SetControllerVariable?.(name, value);
      }
    }

    /**
     * Stores the inherited color set and fans it out to the modifiers and shared
     * groups; a null set is ignored entirely
     * (EveSmartLightColorShareGroup.cpp:180-190).
     */
    SetInheritProperties(colorSet) {
      if (colorSet) {
        this.#parentColorSet = colorSet;
        for (const attributeModifier of this.attributeModifiers) {
          attributeModifier?.SetInheritProperties?.(colorSet);
        }
        for (const group of this.lightGroups) {
          group?.SetInheritProperties?.(colorSet);
        }
      }
    }

    /** Effect-registration fan-out (EveSmartLightColorShareGroup.cpp:192-198). */
    RegisterWithQuadRenderer(quadRenderer) {
      for (const group of this.lightGroups) {
        group?.RegisterWithQuadRenderer?.(quadRenderer);
      }
    }

    /** Carbon method RenderDebugInfo (EveSmartLightColorShareGroup.cpp:200-211). */
    RenderDebugInfo(..._args) {
      throw new Error("EveSmartLightColorShareGroup.RenderDebugInfo is not implemented in CarbonEngineJS.");
    }

    /** Visibility fan-out (EveSmartLightColorShareGroup.cpp:213-219). */
    UpdateVisibility(updateContext, parentTransform, parentLod) {
      for (const group of this.lightGroups) {
        group?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
      }
    }

    // s_PlacementDataWithIdentifierDefaultKey (EveSmartLightColorShareGroup.cpp:7).
  }];
  #defaultPlacement = new _PlacementDataWithIde();
  #up = vec3.fromValues(0, 1, 0);
  #colorValues = vec3.create();
  #sharedColor = vec4.create();
  constructor() {
    super(_EveSmartLightColorSh), _initClass();
  }
}();

export { _EveSmartLightColorSh as EveSmartLightColorShareGroup };
//# sourceMappingURL=EveSmartLightColorShareGroup.js.map
