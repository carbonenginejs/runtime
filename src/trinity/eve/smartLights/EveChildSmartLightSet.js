import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveChildSmartLightSet.h
import { IsMatch } from "#blue";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { INotify } from "../../../global/blue/INotify.js";
import { ITr2DebugRenderable } from "../../../global/interfaces/ITr2DebugRenderable.js";
import { IEveSpaceObjectChild } from "../child/IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "../child/EveSpaceObjectChild.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveChildInheritProperties } from "../child/EveChildInheritProperties.js";
import { EveEntity } from "../EveEntity.js";
import { mat4 } from "#math/mat4";
import { BLUELISTEVENT } from "#consts/blue";

/** A child that drives a placement distribution and fans its per-frame update, visibility, rendering and registration across a set of smart-light groups. */
@be.define("EveChildSmartLightSet")
@blue.inherit(IEveInheritPropertiesOwner)
@blue.inherit(ITr2DebugRenderable, INotify, IListNotify)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(ITr2DebugRenderable)
@be.mapInterface(INotify)
@be.mapInterface(IListNotify)
@be.mapInterface(IEveInheritPropertiesOwner)
@be.mapInterface(EveEntity)
export class EveChildSmartLightSet extends EveChildTransform
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  /** m_distribution (IEveDistributionMethodPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("IEveDistributionMethod")
  distribution = null;

  /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveSmartLightGroup")
  lightGroups = [];

  /** m_inheritProperties (EveChildInheritPropertiesPtr) - lazily created, never persisted (EveChildSmartLightSet.h:72). */
  _inheritProperties = null;

  /**
   * The smart light set's name.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the smart light set's name, coercing the value to a string.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon declares Setup inline empty (EveChildSmartLightSet.h:48). */
  @blue.method
  @meta.adapted
  Setup(_scale = null, _rotation = null, _translation = null, _lowestLodVisible = null)
  {
  }

  /** Carbon declares ChangeLOD inline empty (EveChildSmartLightSet.h:49). */
  @blue.method
  @meta.adapted
  ChangeLOD(_lod)
  {
  }

  /** Smart light sets carry no bound (EveChildSmartLightSet.h:39-42). */
  @blue.method
  @meta.implemented
  GetBoundingSphere(_sphere = null, _query = 0)
  {
    return false;
  }

  /**
   * Rebuilds the world transform, then updates the distribution and every
   * light group (EveChildSmartLightSet.cpp:73-86).
   */

  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    this.UpdateTransform(params.localToWorldTransform);

    if (this.distribution)
    {
      this.distribution.UpdateSyncronous(updateContext, params);
    }

    for (const group of this.lightGroups)
    {
      group.UpdateSyncronous__Distribution(updateContext, params, this.distribution);
    }
  }

  /** Asynchronous fan-out to the distribution and light groups (EveChildSmartLightSet.cpp:88-99). */

  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    if (this.distribution)
    {
      this.distribution.UpdateAsyncronous(updateContext, params);
    }

    for (const group of this.lightGroups)
    {
      group.UpdateAsyncronous__Distribution(updateContext, params, this.distribution);
    }
  }

  /** Visibility fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:101-110). */

  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    if (this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        group.UpdateVisibility(updateContext, parentTransform, parentLod);
      }
    }
  }

  /**
   * display/distribution edits re-register the entity components
   * (EveChildSmartLightSet.cpp:112-119).
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "display") || IsMatch(propertyName, "distribution")) this.ReRegister();
    return true;
  }

  /**
   * Inserted light groups inherit the current color set
   * (EveChildSmartLightSet.cpp:26-71). Carbon's registry (un)wiring of the
   * inserted/removed EveEntity groups is a dynamic list-notify trigger and
   * stays a follow-up (registration is one-shot via
   * EveSpaceScene.ReregisterEntities in this pass).
   */

  @meta.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    const maskedEvent = Number(event) & BLUELISTEVENT.BELIST_EVENTMASK;
    if (
      list === this.lightGroups &&
      maskedEvent === BLUELISTEVENT.BELIST_INSERTED &&
      this._inheritProperties &&
      value
    )
    {
      value.SetInheritProperties(this._inheritProperties.GetProperties());
    }

    if (
      list === this.lightGroups &&
      (Number(event) & BLUELISTEVENT.BELIST_LOADING) === 0 &&
      this.IsInRegistry()
    )
    {
      const registry = this.GetComponentRegistry();
      if (maskedEvent === BLUELISTEVENT.BELIST_INSERTED && value instanceof EveEntity)
      {
        value.Register(registry);
      }
      else if (maskedEvent === BLUELISTEVENT.BELIST_REMOVED && value instanceof EveEntity)
      {
        value.UnRegister(registry);
      }
      else if (maskedEvent === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const group of this.lightGroups)
        {
          if (group instanceof EveEntity)
          {
            group.UnRegister(registry);
          }
        }
      }
    }
  }

  /** Carbon EveChildSmartLightSet::RegisterComponents (cpp:121-134):
   * forward-only to the light groups. Gate m_distribution && m_display. */

  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        if (group instanceof EveEntity)
        {
          group.Register(registry);
        }
      }
    }
  }

  /** Carbon EveChildSmartLightSet::UnRegisterComponents (cpp:136-149):
   * forwards to the light groups; no distribution/display re-check. */

  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const group of this.lightGroups)
      {
        if (group instanceof EveEntity)
        {
          group.UnRegister(registry);
        }
      }
    }
  }

  /** Renderable fan-out, gated on the distribution and display (EveChildSmartLightSet.cpp:151-160). */

  @meta.implemented
  GetRenderables(renderables = [])
  {
    if (this.distribution && this.display)
    {
      for (const group of this.lightGroups)
      {
        group.GetRenderables(renderables);
      }
    }
    return renderables;
  }

  /**
   * Carbon GetLocalToWorldTransform( Matrix& ) (EveChildSmartLightSet.cpp:162-165): copies the world transform into out, and returns out.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */

  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    return mat4.copy(out, this.worldTransform);
  }

  /** Fans a controller variable to the distribution and light groups (EveChildSmartLightSet.cpp:167-178). */

  @meta.implemented
  SetControllerVariable(name, value)
  {
    if (this.distribution)
    {
      this.distribution.SetControllerVariable(name, value);
    }

    for (const group of this.lightGroups)
    {
      group.SetControllerVariable(name, value);
    }
  }

  /** Carbon debug-render fan-out for every light group at every placement. */

  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (this.display && this.distribution)
    {
      const placements = this.distribution.GetPlacementData();
      const size = this.distribution.GetNumberOfPlacements();
      for (const group of this.lightGroups)
      {
        group.RenderDebugInfo(renderer, placements, size);
      }
    }
  }

  /**
   * Advertises the smartLightSets debug option (EveChildSmartLightSet.cpp:210-213).
   *
   * Adapted: The caller supplies a JavaScript Set for native debug-option strings.
   */

  @meta.adapted
  GetDebugOptions(options)
  {
    options.add("smartLightSets");
  }

  /**
   * Quad fan-out with the distribution's placement data
   * (EveChildSmartLightSet.cpp:191-200).
   */

  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.distribution)
    {
      const placements = this.distribution.GetPlacementData();
      const size = Number(this.distribution.GetNumberOfPlacements());
      for (const group of this.lightGroups)
      {
        group.AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer);
      }
    }
  }

  /** Effect-registration fan-out (EveChildSmartLightSet.cpp:202-208). */

  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const group of this.lightGroups)
    {
      group.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /**
   * Lazily creates the property holder, stores the color set, and fans it out
   * to every light group (EveChildSmartLightSet.cpp:215-227).
   */

  @meta.implemented
  SetInheritProperties(colorSet)
  {
    if (!this._inheritProperties)
    {
      this._inheritProperties = new EveChildInheritProperties();
    }
    this._inheritProperties.SetProperties(colorSet);

    for (const group of this.lightGroups)
    {
      group.SetInheritProperties(colorSet);
    }
  }

  static _identity = mat4.create();

}

// EveChildSmartLightSet_Blue.cpp: native exposure.
