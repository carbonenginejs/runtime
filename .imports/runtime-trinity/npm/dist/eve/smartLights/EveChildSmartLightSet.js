import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../child/EveChildTransform.js';
import { EveChildInheritProperties as _EveChildInheritPrope } from '../child/EveChildInheritProperties.js';
import { EveEntity as _EveEntity } from '../EveEntity.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { BELIST_INSERTED, BELIST_LOADING, BELIST_REMOVED, BELIST_UNLOADSTART, BELIST_EVENTMASK } from '../../controllers/contracts.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_distribution, _init_extra_distribution, _init_lightGroups, _init_extra_lightGroups;

/** A child that drives a placement distribution and fans its per-frame update, visibility, rendering and registration across a set of smart-light groups. */
let _EveChildSmartLightSe;
new class extends _identity {
  static [class EveChildSmartLightSet extends _EveChildTransform {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_display, _init_extra_display, _init_distribution, _init_extra_distribution, _init_lightGroups, _init_extra_lightGroups, _initProto],
        c: [_EveChildSmartLightSe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildSmartLightSet",
        family: "eve/smartLights"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.model("IEveDistributionMethod")], 16, "distribution"], [[io, io.persist, void 0, type.list("IEveSmartLightGroup")], 16, "lightGroups"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.noop], 18, "Setup"], [[carbon, carbon.method, impl, impl.noop], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon re-registers on m_display/m_distribution Var edits; JS forwards every OnModified to the EveEntity ReRegister lifecycle on the flattened EveChildTransform base.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RenderDebugInfo"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2DebugRendererOptions is a std::set of option names; the duck-typed bag accepts add or insert.")], 18, "GetDebugOptions"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddQuadsToQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"]], 0, void 0, _EveChildTransform));
    }
    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_initProto(this), _init_name(this, ""));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_name(this), _init_display(this, true));

    /** m_distribution (IEveDistributionMethodPtr) [READWRITE, PERSIST] */
    distribution = (_init_extra_display(this), _init_distribution(this, null));

    /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST] */
    lightGroups = (_init_extra_distribution(this), _init_lightGroups(this, []));

    /** m_inheritProperties (EveChildInheritPropertiesPtr) - lazily created, never persisted (EveChildSmartLightSet.h:72). */
    #inheritProperties = (_init_extra_lightGroups(this), null);
    /**
     * The smart light set's name.
     */
    GetName() {
      return this.name;
    }
    /**
     * Sets the smart light set's name, coercing the value to a string.
     */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /** Carbon declares Setup inline empty (EveChildSmartLightSet.h:48). */
    Setup(_scale = null, _rotation = null, _translation = null, _lowestLodVisible = null) {}

    /** Carbon declares ChangeLOD inline empty (EveChildSmartLightSet.h:49). */
    ChangeLOD(_lod) {}

    /** Smart light sets carry no bound (EveChildSmartLightSet.h:39-42). */
    GetBoundingSphere(_sphere = null, _query = 0) {
      return false;
    }

    /**
     * Rebuilds the world transform, then updates the distribution and every
     * light group (EveChildSmartLightSet.cpp:73-86).
     */
    UpdateSyncronous(updateContext, params) {
      this.UpdateTransform(params.localToWorldTransform);
      if (this.distribution) {
        this.distribution.UpdateSyncronous(updateContext, params);
      }
      for (const group of this.lightGroups) {
        group.UpdateSyncronous(updateContext, params, this.distribution);
      }
    }

    /** Asynchronous fan-out to the distribution and light groups (EveChildSmartLightSet.cpp:88-99). */
    UpdateAsyncronous(updateContext, params) {
      if (this.distribution) {
        this.distribution.UpdateAsyncronous(updateContext, params);
      }
      for (const group of this.lightGroups) {
        group.UpdateAsyncronous(updateContext, params, this.distribution);
      }
    }

    /** Visibility fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:101-110). */
    UpdateVisibility(updateContext, parentTransform, parentLod) {
      if (this.distribution && this.display) {
        for (const group of this.lightGroups) {
          group.UpdateVisibility(updateContext, parentTransform, parentLod);
        }
      }
    }

    /**
     * display/distribution edits re-register the entity components
     * (EveChildSmartLightSet.cpp:112-119).
     */
    OnModified(_options = {}) {
      this.ReRegister();
      return true;
    }

    /**
     * Inserted light groups inherit the current color set
     * (EveChildSmartLightSet.cpp:26-71). Carbon's registry (un)wiring of the
     * inserted/removed EveEntity groups is a dynamic list-notify trigger and
     * stays a follow-up (registration is one-shot via
     * EveSpaceScene.ReregisterEntities in this pass).
     */
    OnListModified(event, _key, _key2, value, list) {
      const maskedEvent = Number(event) & BELIST_EVENTMASK;
      if (list === this.lightGroups && maskedEvent === BELIST_INSERTED && this.#inheritProperties && value) {
        value.SetInheritProperties(this.#inheritProperties.GetProperties());
      }
      if (list === this.lightGroups && (Number(event) & BELIST_LOADING) === 0 && this.IsInRegistry()) {
        const registry = this.GetComponentRegistry();
        if (maskedEvent === BELIST_INSERTED && value instanceof _EveEntity) {
          value.Register(registry);
        } else if (maskedEvent === BELIST_REMOVED && value instanceof _EveEntity) {
          value.UnRegister(registry);
        } else if (maskedEvent === BELIST_UNLOADSTART) {
          for (const group of this.lightGroups) {
            if (group instanceof _EveEntity) {
              group.UnRegister(registry);
            }
          }
        }
      }
    }

    /** Carbon EveChildSmartLightSet::RegisterComponents (cpp:121-134):
     * forward-only to the light groups. Gate m_distribution && m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.distribution && this.display) {
        for (const group of this.lightGroups) {
          if (group instanceof _EveEntity) {
            group.Register(registry);
          }
        }
      }
    }

    /** Carbon EveChildSmartLightSet::UnRegisterComponents (cpp:136-149):
     * forwards to the light groups; no distribution/display re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const group of this.lightGroups) {
          if (group instanceof _EveEntity) {
            group.UnRegister(registry);
          }
        }
      }
    }

    /** Renderable fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:151-160). */
    GetRenderables(renderables = []) {
      if (this.distribution && this.display) {
        for (const group of this.lightGroups) {
          group.GetRenderables(renderables);
        }
      }
      return renderables;
    }

    /** Returns the local-to-world matrix (EveChildSmartLightSet.cpp:162-165). */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /** Fans a controller variable to the distribution and light groups (EveChildSmartLightSet.cpp:167-178). */
    SetControllerVariable(name, value) {
      if (this.distribution) {
        this.distribution.SetControllerVariable(name, value);
      }
      for (const group of this.lightGroups) {
        group.SetControllerVariable(name, value);
      }
    }

    /** Carbon method RenderDebugInfo (EveChildSmartLightSet.cpp:180-189). */
    RenderDebugInfo(..._args) {
      throw new Error("EveChildSmartLightSet.RenderDebugInfo is not implemented in CarbonEngineJS.");
    }

    /** Advertises the smartLightSets debug option (EveChildSmartLightSet.cpp:210-213); options is a Set-like bag. */
    GetDebugOptions(options) {
      options.add("smartLightSets");
    }

    /**
     * Quad fan-out with the distribution's placement data
     * (EveChildSmartLightSet.cpp:191-200).
     */
    AddQuadsToQuadRenderer(frustum, quadRenderer) {
      if (this.display && this.distribution) {
        const placements = this.distribution.GetPlacementData();
        const size = Number(this.distribution.GetNumberOfPlacements());
        for (const group of this.lightGroups) {
          group.AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer);
        }
      }
    }

    /** Effect-registration fan-out (EveChildSmartLightSet.cpp:202-208). */
    RegisterWithQuadRenderer(quadRenderer) {
      for (const group of this.lightGroups) {
        group.RegisterWithQuadRenderer(quadRenderer);
      }
    }

    /**
     * Lazily creates the property holder, stores the color set, and fans it out
     * to every light group (EveChildSmartLightSet.cpp:215-227).
     */
    SetInheritProperties(colorSet) {
      if (!this.#inheritProperties) {
        this.#inheritProperties = new _EveChildInheritPrope();
      }
      this.#inheritProperties.SetProperties(colorSet);
      for (const group of this.lightGroups) {
        group.SetInheritProperties(colorSet);
      }
    }
  }];
  #identity = mat4.create();
  constructor() {
    super(_EveChildSmartLightSe), _initClass();
  }
}();

export { _EveChildSmartLightSe as EveChildSmartLightSet };
//# sourceMappingURL=EveChildSmartLightSet.js.map
