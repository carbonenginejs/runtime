// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh.h
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh.cpp
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightMesh_Blue.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildMesh } from "../child/EveChildMesh.js";
import { EveChildInstanceMeshRenderer } from "../child/EveChildInstanceMeshRenderer.js";
import { PlacementDataWithIdentifier } from "../PlacementDataWithIdentifier.js";
import { resolveGroupColor } from "./EveSmartLightBaseGroup.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2InstancedMesh } from "../../core/mesh/Tr2InstancedMesh.js";
import { RotationalConstraints } from "../../generated/eve/child/enums.js";
import { BELIST_INSERTED } from "../../controllers/contracts.js";


/**
 * A smart-light group rendered through the shared instance-mesh CPU stream.
 * Carbon's EveSmartLightBaseGroup secondary base is flattened because
 * JavaScript has single inheritance.
 */
@type.define({
  className: "EveSmartLightMesh",
  family: "eve/smartLights",
  fields: {
    castShadows: [ type.boolean, io.persist ]
  }
})
@type.hideInherited([
  "partTag",
  "distribution"
])
export class EveSmartLightMesh extends EveChildInstanceMeshRenderer
{
  @io.persist
  @type.string
  shaderParamColorName = "";

  // Flattened EveSmartLightBaseGroup secondary base.

  @io.notify
  @io.persist
  @type.int32
  factionColor = -1;

  @io.persist
  @type.boolean
  useFactionColor = false;

  @io.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  @io.persist
  @type.color
  customColor = vec4.createLinear();

  /** Carbon m_castShadow is exposed under the canonical derived key. */
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
  #parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #resolvedGroupColor = vec4.createLinear();

  /** Carbon m_lastAreaColor = (0,0,0,1). */
  #lastAreaColor = vec4.createLinear();

  /** A count/refresh skipped by the upload gate remains armed. */
  #geometryDirty = false;

  /** Faction-aware group color from the flattened secondary base. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base through its shared resolver.")
  GetGroupColor()
  {
    return resolveGroupColor(
      this.customColor,
      this.useFactionColor,
      this.factionColor,
      this.#parentColorSet,
      this.#resolvedGroupColor
    );
  }

  /** Overwrites the authored custom color. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** Stores the inherited faction colors and updates every modifier directly. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this.#parentColorSet = colorSet;
    }
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /** Fans a controller variable out to every modifier. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetControllerVariable(name, value);
    }
  }

  /** Newly inserted modifiers receive the current inherited color set. */
  @carbon.method
  @impl.adapted
  @impl.reason("CjsModel emits Carbon-compatible BELIST codes; only an inserted modifier inherits the current color set.")
  OnListModified(event, _key, _key2, value, list)
  {
    if (
      list === this.attributeModifiers &&
      Number(event) === BELIST_INSERTED &&
      this.#parentColorSet &&
      value
    )
    {
      value.SetInheritProperties(this.#parentColorSet);
    }
  }

  /**
   * The two-argument EveChildMesh overload is a deliberate no-op. With the
   * third argument, the owning EveChildSmartLightSet supplies the distribution.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript dispatches Carbon's two UpdateSyncronous overloads by argument count; the smart-light set owns the distribution.")
  UpdateSyncronous(updateContext, params, distribution)
  {
    if (arguments.length < 3)
    {
      return;
    }

    EveChildMesh.prototype.UpdateSyncronous.call(this, updateContext, params);
    if (!distribution || !this.display)
    {
      return;
    }

    const entityCount = Number(distribution.GetNumberOfPlacements()) >>> 0;
    const updateCount = this._lastEntityCount !== entityCount;
    this._lastEntityCount = entityCount;
    if (updateCount) this.#geometryDirty = true;

    if (entityCount === 0)
    {
      return;
    }

    const placements = distribution.GetPlacementData();
    const color = EveSmartLightMesh.#color;
    vec4.scale(color, this.GetGroupColor(), this._GetActivationStrength());

    if (this.attributeModifiers.length)
    {
      const firstPlacement = EveSmartLightMesh.#ClonePlacement(placements[0]);
      const firstRotation = EveSmartLightMesh.#firstRotation;
      const firstRotationQuaternion = EveSmartLightMesh.#firstRotationQuaternion;
      vec3.set(firstRotation, 0, 1, 0);
      // Carbon row-vector: initialRotation * additionalRotation.
      quat.multiply(
        firstRotationQuaternion,
        firstPlacement.additionalRotation,
        firstPlacement.initialRotation
      );
      vec3.transformQuat(firstRotation, firstRotation, firstRotationQuaternion);
      EveSmartLightMesh.#TransformNormal(firstRotation, firstRotation, this.worldTransform);
      const center = distribution.GetPlacementDataCenter();
      for (const attributeModifier of this.attributeModifiers)
      {
        attributeModifier.ProcessAttributeModifier(
          EveSmartLightMesh.#colorRgb,
          firstPlacement,
          center,
          firstRotation,
          params.activationStrength
        );
      }
    }

    this.SetMeshColorParameter(color);

    if (!(this.mesh instanceof Tr2InstancedMesh))
    {
      return;
    }
    if (!this.mesh.GetInstanceGeometryResource())
    {
      this.ConfigureInstanceData();
      this.#geometryDirty = true;
    }

    const alwaysUpdate = distribution.GetHasDynamicMovement() ||
      this.rotationConstraint !== RotationalConstraints.NONE;
    if (this.#geometryDirty || alwaysUpdate || this._refreshStaticGeometry)
    {
      const published = this.UpdateGeometryResource(
        placements,
        entityCount,
        updateContext.renderContext
      );
      this.UpdateBoundingSphere(placements, distribution);
      if (published)
      {
        this.#geometryDirty = false;
        this._refreshStaticGeometry = false;
      }
    }
  }

  /** Carbon's two-argument overload is a no-op; the three-argument one updates the mesh base. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript dispatches Carbon's two UpdateAsyncronous overloads by argument count.")
  UpdateAsyncronous(updateContext, params, _distribution)
  {
    if (arguments.length < 3)
    {
      return;
    }
    return super.UpdateAsyncronous(updateContext, params);
  }

  /** Forward to the instance renderer's two-stage visibility pass. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    return super.UpdateVisibility(updateContext, parentTransform, parentLod);
  }

  /** Forward renderable collection to the instance renderer. */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    return super.GetRenderables(renderables);
  }

  /** Smart groups report the last set-owned distribution count. */
  @carbon.method
  @impl.implemented
  GetNumberOfEntities()
  {
    return this._lastEntityCount;
  }

  /** Keeps SmartLightMesh's separate refresh latch armed as well. */
  @carbon.method
  @impl.adapted
  @impl.reason("The inherited Carbon method is exposed on this derived Blue class; JS also arms the derived distribution path's explicit deferred-work latch.")
  RefreshStaticGeometry()
  {
    super.RefreshStaticGeometry();
    this.#geometryDirty = true;
  }

  /**
   * Applies a resolved group color to every Tr2Effect area, preserving Carbon's
   * path/display/resource/mesh-index guards and exact last-color cache.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("TriGeometryRes exposes mesh validity through its maintained count contract instead of Carbon's native GetMeshData pointer.")
  SetMeshColorParameter(meshColor)
  {
    if (!this.shaderParamColorName || !this.display || vec4.exactEquals(this.#lastAreaColor, meshColor))
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
        effect.SetParameter(this.shaderParamColorName, meshColor);
      }
    }

    vec4.copy(this.#lastAreaColor, meshColor);
    return true;
  }

  /** Clone Carbon's by-value first placement before modifiers see it. */
  static #ClonePlacement(value)
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
  static #TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  static #color = vec4.create();

  /** Carbon passes currentColor.GetXYZ(), so modifiers cannot mutate alpha. */
  static #colorRgb = EveSmartLightMesh.#color.subarray(0, 3);

  static #firstRotation = vec3.create();

  static #firstRotationQuaternion = quat.create();
}
