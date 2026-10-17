// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IEveShadowCaster } from "../IEveShadowCaster.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh.cpp
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh_Blue.cpp
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveChildMesh } from "../child/EveChildMesh.js";
import { EveChildInstanceMeshRenderer } from "../child/EveChildInstanceMeshRenderer.js";
import { PlacementDataWithIdentifier } from "../PlacementDataWithIdentifier.js";
import { EveSmartLightBaseGroup, resolveGroupColor } from "./EveSmartLightBaseGroup.js";
import { IEveSmartLightGroup } from "./IEveSmartLightGroup.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2InstancedMesh } from "../../core/mesh/Tr2InstancedMesh.js";
import { RotationalConstraints } from "../../generated/eve/child/enums.js";
import { BLUELISTEVENT } from "#consts/blue";


/**
 * A smart-light group rendered through the shared instance-mesh CPU stream.
 * Carbon's EveSmartLightBaseGroup secondary base is flattened because
 * JavaScript has single inheritance.
 */
@blue.define("EveSmartLightMesh")
@meta.hideInherited([
  "partTag",
  "distribution"
])
@blue.inherit(EveSmartLightBaseGroup)
@blue.interface(EveChildInstanceMeshRenderer, IEveSmartLightGroup, ITr2Renderable, IInitialize, INotify, IEveShadowCaster)
export class EveSmartLightMesh extends EveChildInstanceMeshRenderer
{
  @blue.readwrite
  @blue.persist
  @type.string
  shaderParamColorName = "";

  // Flattened EveSmartLightBaseGroup secondary base.

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  factionColor = -1;

  @blue.readwrite
  @blue.persist
  @type.boolean
  useFactionColor = false;

  @blue.notify
  @blue.read
  @blue.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  @blue.readwrite
  @blue.persist
  @type.color
  customColor = color.createLinear();

  /**
   * Carbon m_castShadow is exposed under the canonical derived key:
   * MAP_ATTRIBUTE("castShadows", m_castShadow, "", Be::READWRITE | Be::PERSIST)
   * (EveSmartLightMesh_Blue.cpp:25). Ours: the storage is the inherited
   * castShadow member, so the row is an attribute over this accessor pair.
   */
  @blue.readwrite
  @blue.persist
  @type.boolean
  get castShadows()
  {
    return this.castShadow;
  }

  /** Updates the inherited runtime flag through Carbon's derived key. */
  set castShadows(value)
  {
    this.castShadow = !!value;
  }

  /** Carbon m_parentColorSet, never persisted. */
  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _resolvedGroupColor = color.createLinear();

  /** Carbon m_lastAreaColor = (0,0,0,1). */
  _lastAreaColor = color.createLinear();

  /**
   * Faction-aware group color from the flattened secondary base.
   *
   * Adapted: Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base through
   * its shared resolver.
   */
  @blue.method
  @meta.adapted
  GetGroupColor()
  {
    return resolveGroupColor(
      this.customColor,
      this.useFactionColor,
      this.factionColor,
      this._parentColorSet,
      this._resolvedGroupColor
    );
  }

  /**
   * Overwrites the authored custom color.
   *
   * Adapted: Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.
   */
  @blue.method
  @meta.adapted
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /**
   * Stores the inherited faction colors and updates every modifier directly.
   *
   * Adapted: Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.
   */
  @blue.method
  @meta.adapted
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this._parentColorSet = colorSet;
    }
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /**
   * Fans a controller variable out to every modifier.
   *
   * Adapted: Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.
   */
  @blue.method
  @meta.adapted
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetControllerVariable(name, value);
    }
  }

  /**
   * Newly inserted modifiers receive the current inherited color set.
   *
   * Adapted: Receives the Blue list event, inserted value and owning array explicitly; only
   * an inserted modifier inherits the current colour set.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, _key, _key2, value, list)
  {
    if (
      list === this.attributeModifiers &&
      Number(event) === BLUELISTEVENT.BELIST_INSERTED &&
      this._parentColorSet &&
      value
    )
    {
      value.SetInheritProperties(this._parentColorSet);
    }
  }

  /**
   * Carbon's EveChildMesh overload UpdateSyncronous( context, params ): an
   * empty override (EveSmartLightMesh.h:23); the owning EveChildSmartLightSet
   * drives this mesh through UpdateSyncronous__Distribution instead.
   */
  @blue.method
  @meta.noop
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Carbon's IEveSmartLightGroup overload UpdateSyncronous( context, params,
   * distribution ) (EveSmartLightMesh.cpp:21); the owning EveChildSmartLightSet
   * supplies the distribution.
   */
  @meta.implemented
  @blue.method
  UpdateSyncronous__Distribution(updateContext, params, distribution)
  {
    EveChildMesh.prototype.UpdateSyncronous.call(this, updateContext, params);
    if (!distribution || !this.display)
    {
      return;
    }

    const entityCount = Number(distribution.GetNumberOfPlacements()) >>> 0;
    const updateCount = this._lastEntityCount !== entityCount;
    this._lastEntityCount = entityCount;
    if (updateCount) this._geometryDirty = true;

    if (entityCount === 0)
    {
      return;
    }

    const placements = distribution.GetPlacementData();
    const color = EveSmartLightMesh._color;
    vec4.scale(color, this.GetGroupColor(), this._GetActivationStrength());

    if (this.attributeModifiers.length)
    {
      const firstPlacement = EveSmartLightMesh._ClonePlacement(placements[0]);
      const firstRotation = EveSmartLightMesh._firstRotation;
      const firstRotationQuaternion = EveSmartLightMesh._firstRotationQuaternion;
      vec3.set(firstRotation, 0, 1, 0);
      // Carbon row-vector: initialRotation * additionalRotation.
      quat.multiply(
        firstRotationQuaternion,
        firstPlacement.additionalRotation,
        firstPlacement.initialRotation
      );
      vec3.transformQuat(firstRotation, firstRotation, firstRotationQuaternion);
      EveSmartLightMesh._TransformNormal(firstRotation, firstRotation, this.worldTransform);
      const center = distribution.GetPlacementDataCenter();
      for (const attributeModifier of this.attributeModifiers)
      {
        attributeModifier.ProcessAttributeModifier(
          EveSmartLightMesh._colorRgb,
          firstPlacement,
          center,
          firstRotation,
          params.activationStrength
        );
      }
    }

    this.SetMeshColorParameter(color);

    // Carbon caches the downcast (m_instancedMesh) and skips a non-instanced
    // mesh; the skip is the donor behaviour.
    if (!CjsSchema.cast(this.mesh, Tr2InstancedMesh))
    {
      return;
    }
    if (!this.mesh.GetInstanceGeometryResource())
    {
      this.ConfigureInstanceData();
      this._geometryDirty = true;
    }

    const alwaysUpdate = distribution.GetHasDynamicMovement() ||
      this.rotationConstraint !== RotationalConstraints.NONE;
    if (this._geometryDirty || alwaysUpdate || this._refreshStaticGeometry)
    {
      const published = this.UpdateGeometryResource(
        placements,
        entityCount,
        updateContext.renderContext
      );
      this.UpdateBoundingSphere(placements, distribution);
      if (published)
      {
        this._geometryDirty = false;
        this._refreshStaticGeometry = false;
      }
    }
  }

  /** Carbon's EveChildMesh overload UpdateAsyncronous( context, params ): an empty override (EveSmartLightMesh.h:24). */
  @blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext, _params)
  {
  }

  /**
   * Carbon's IEveSmartLightGroup overload UpdateAsyncronous( context, params,
   * distribution ) (EveSmartLightMesh.cpp:139): updates the instance-mesh base.
   */
  @meta.implemented
  @blue.method
  UpdateAsyncronous__Distribution(updateContext, params, _distribution)
  {
    return super.UpdateAsyncronous(updateContext, params);
  }

  /** Forward to the instance renderer's two-stage visibility pass. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    return super.UpdateVisibility(updateContext, parentTransform, parentLod);
  }

  /** Forward renderable collection to the instance renderer. */
  @blue.method
  @meta.implemented
  GetRenderables(renderables = [])
  {
    return super.GetRenderables(renderables);
  }

  /** Smart groups report the last set-owned distribution count. */
  @blue.method
  @meta.implemented
  GetNumberOfEntities()
  {
    return this._lastEntityCount;
  }

  /**
   * Keeps SmartLightMesh's separate refresh latch armed as well.
   *
   * Adapted: The inherited Carbon method is exposed on this derived Blue class; JS also arms
   * the derived distribution path's explicit deferred-work latch.
   */
  @blue.method
  @meta.adapted
  RefreshStaticGeometry()
  {
    super.RefreshStaticGeometry();
    this._geometryDirty = true;
  }

  /**
   * Applies a resolved group color to every Tr2Effect area, preserving Carbon's
   * path/display/resource/mesh-index guards and exact last-color cache.
   *
   * Adapted: TriGeometryRes exposes mesh validity through its maintained count contract
   * instead of Carbon's native GetMeshData pointer.
   */
  @blue.method
  @meta.adapted
  SetMeshColorParameter(meshColor)
  {
    if (!this.shaderParamColorName || !this.display || vec4.exactEquals(this._lastAreaColor, meshColor))
    {
      return false;
    }
    if (!this.mesh)
    {
      return false;
    }

    const geometry = this.mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood())
    {
      return false;
    }
    const meshIndex = this.mesh.GetMeshIndex();
    if (meshIndex < 0 || meshIndex >= geometry.GetMeshCount())
    {
      return false;
    }
    if (!this.mesh.GetDisplay())
    {
      return false;
    }

    for (const area of this.mesh.GetAllAreas())
    {
      const effect = area.GetMaterialInterface();
      if (effect instanceof Tr2Effect)
      {
        effect.SetParameter__Vector4(this.shaderParamColorName, meshColor);
      }
    }

    vec4.copy(this._lastAreaColor, meshColor);
    return true;
  }

  /** Clone Carbon's by-value first placement before modifiers see it. */
  static _ClonePlacement(value)
  {
    const out = new PlacementDataWithIdentifier();
    vec3.copy(out.initialTranslation, value.initialTranslation);
    quat.copy(out.initialRotation, value.initialRotation);
    vec3.copy(out.initialScale, value.initialScale);
    vec3.copy(out.additionalTranslation, value.additionalTranslation);
    vec3.copy(out.translationFrameDelta, value.translationFrameDelta);
    quat.copy(out.additionalRotation, value.additionalRotation);
    vec3.copy(out.additionalScale, value.additionalScale);
    out.boneIndex = value.boneIndex;
    out.lifeTime = value.lifeTime;
    out.uniqueID = value.uniqueID;
    out.initialPlacementID = value.initialPlacementID;
    return out;
  }

  /** Carbon TriVectorRotateMatrix: basis-only transform, no translation. */
  static _TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  static _color = vec4.create();

  /** Carbon passes currentColor.GetXYZ(), so modifiers cannot mutate alpha. */
  static _colorRgb = EveSmartLightMesh._color.subarray(0, 3);

  static _firstRotation = vec3.create();

  static _firstRotationQuaternion = quat.create();
}

// EveSmartLightMesh_Blue.cpp: native exposure.
