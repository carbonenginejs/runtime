// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveChildSmartLightSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveChildInheritProperties } from "../child/EveChildInheritProperties.js";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";

/** A child that drives a placement distribution and fans its per-frame update, visibility, rendering and registration across a set of smart-light groups. */
@type.define({ className: "EveChildSmartLightSet", family: "eve/smartLights" })
export class EveChildSmartLightSet extends EveChildTransform
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_distribution (IEveDistributionMethodPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("IEveDistributionMethod")
  distribution = null;

  /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSmartLightGroup")
  lightGroups = [];

  /** m_inheritProperties (EveChildInheritPropertiesPtr) - lazily created, never persisted (EveChildSmartLightSet.h:72). */
  #inheritProperties = null;

  @carbon.method
  @impl.implemented
  /**
   * The smart light set's name.
   */
  GetName()
  {
    return this.name;
  }

  @carbon.method
  @impl.implemented
  /**
   * Sets the smart light set's name, coercing the value to a string.
   */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon declares Setup inline empty (EveChildSmartLightSet.h:48). */
  @carbon.method
  @impl.noop
  Setup(_scale = null, _rotation = null, _translation = null, _lowestLodVisible = null)
  {
  }

  /** Carbon declares ChangeLOD inline empty (EveChildSmartLightSet.h:49). */
  @carbon.method
  @impl.noop
  ChangeLOD(_lod)
  {
  }

  /** Smart light sets carry no bound (EveChildSmartLightSet.h:39-42). */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(_sphere = null, _query = 0)
  {
    return false;
  }

  /**
   * Rebuilds the world transform, then updates the distribution and every
   * light group (EveChildSmartLightSet.cpp:73-86).
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params)
  {
    this.UpdateTransform(params?.localToWorldTransform ?? EveChildSmartLightSet.#identity);

    this.distribution?.UpdateSyncronous?.(updateContext, params);

    for (const group of this.lightGroups)
    {
      group?.UpdateSyncronous?.(updateContext, params, this.distribution);
    }
  }

  /** Asynchronous fan-out to the distribution and light groups (EveChildSmartLightSet.cpp:88-99). */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, params)
  {
    this.distribution?.UpdateAsyncronous?.(updateContext, params);

    for (const group of this.lightGroups)
    {
      group?.UpdateAsyncronous?.(updateContext, params, this.distribution);
    }
  }

  /** Visibility fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:101-110). */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    if (this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        group?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
      }
    }
  }

  /**
   * display/distribution edits re-register the entity components
   * (EveChildSmartLightSet.cpp:112-119).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon re-registers on m_display/m_distribution Var edits; JS forwards every OnModified to the EveEntity ReRegister lifecycle on the flattened EveChildTransform base.")
  OnModified(_options = {})
  {
    this.ReRegister?.();
    return true;
  }

  /**
   * Inserted light groups inherit the current color set
   * (EveChildSmartLightSet.cpp:26-71). Carbon's registry (un)wiring of the
   * inserted/removed EveEntity groups is a dynamic list-notify trigger and
   * stays a follow-up (registration is one-shot via
   * EveSpaceScene.ReregisterEntities in this pass).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("List events carry no BELIST insert mask; the inserted value (or, absent one, the whole list) is re-fanned - SetInheritProperties is idempotent.")
  OnListModified(_event, _key, _key2, value, list)
  {
    if (list === this.lightGroups && this.#inheritProperties)
    {
      const properties = this.#inheritProperties.GetProperties();
      if (value)
      {
        value.SetInheritProperties?.(properties);
      }
      else
      {
        for (const group of this.lightGroups)
        {
          group?.SetInheritProperties?.(properties);
        }
      }
    }
  }

  /** Carbon EveChildSmartLightSet::RegisterComponents (cpp:121-134):
   * forward-only to the light groups. Gate m_distribution && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        group?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildSmartLightSet::UnRegisterComponents (cpp:136-149):
   * forwards to the light groups; no distribution/display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const group of this.lightGroups)
      {
        group?.UnRegister?.(registry);
      }
    }
  }

  /** Renderable fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:151-160). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    if (this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        group?.GetRenderables?.(renderables);
      }
    }
    return renderables;
  }

  /** Returns the local-to-world matrix (EveChildSmartLightSet.cpp:162-165). */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /** Fans a controller variable to the distribution and light groups (EveChildSmartLightSet.cpp:167-178). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    this.distribution?.SetControllerVariable?.(name, value);

    for (const group of this.lightGroups)
    {
      group?.SetControllerVariable?.(name, value);
    }
  }

  /** Carbon method RenderDebugInfo (EveChildSmartLightSet.cpp:180-189). */
  @carbon.method
  @impl.notImplemented
  RenderDebugInfo(..._args)
  {
    throw new Error("EveChildSmartLightSet.RenderDebugInfo is not implemented in CarbonEngineJS.");
  }

  /** Advertises the smartLightSets debug option (EveChildSmartLightSet.cpp:210-213); options is a Set-like bag. */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2DebugRendererOptions is a std::set of option names; the duck-typed bag accepts add or insert.")
  GetDebugOptions(options)
  {
    if (options?.add)
    {
      options.add("smartLightSets");
    }
    else
    {
      options?.insert?.("smartLightSets");
    }
  }

  /**
   * Quad fan-out with the distribution's placement data
   * (EveChildSmartLightSet.cpp:191-200).
   */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.distribution)
    {
      const placements = this.distribution.GetPlacementData?.() ?? [];
      const size = Number(this.distribution.GetNumberOfPlacements?.() ?? placements.length);
      for (const group of this.lightGroups)
      {
        group?.AddQuadsToQuadRenderer?.(placements, size, frustum, quadRenderer);
      }
    }
  }

  /** Effect-registration fan-out (EveChildSmartLightSet.cpp:202-208). */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const group of this.lightGroups)
    {
      group?.RegisterWithQuadRenderer?.(quadRenderer);
    }
  }

  /**
   * Lazily creates the property holder, stores the color set, and fans it out
   * to every light group (EveChildSmartLightSet.cpp:215-227).
   */
  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (!this.#inheritProperties)
    {
      this.#inheritProperties = new EveChildInheritProperties();
    }
    this.#inheritProperties.SetProperties(colorSet);

    for (const group of this.lightGroups)
    {
      group?.SetInheritProperties?.(colorSet);
    }
  }

  static #identity = mat4.create();

}
