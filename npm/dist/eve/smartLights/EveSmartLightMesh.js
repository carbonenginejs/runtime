import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildMesh as _EveChildMesh } from '../child/EveChildMesh.js';
import { EveChildInstanceMeshRenderer as _EveChildInstanceMesh } from '../child/EveChildInstanceMeshRenderer.js';
import { PlacementDataWithIdentifier as _PlacementDataWithIde } from '../PlacementDataWithIdentifier.js';
import { resolveGroupColor } from './EveSmartLightBaseGroup.js';
import { Tr2Effect as _Tr2Effect } from '../../shader/Tr2Effect.js';
import { Tr2InstancedMesh as _Tr2InstancedMesh } from '../../core/mesh/Tr2InstancedMesh.js';
import { RotationalConstraints } from '../../generated/eve/child/enums.js';
import { BELIST_INSERTED } from '../../controllers/contracts.js';

let _initProto, _initClass, _init_shaderParamColorName, _init_extra_shaderParamColorName, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor;

/**
 * A smart-light group rendered through the shared instance-mesh CPU stream.
 * Carbon's EveSmartLightBaseGroup secondary base is flattened because
 * JavaScript has single inheritance.
 */
let _EveSmartLightMesh;
new class extends _identity {
  static [class EveSmartLightMesh extends _EveChildInstanceMesh {
    static {
      ({
        e: [_init_shaderParamColorName, _init_extra_shaderParamColorName, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor, _initProto],
        c: [_EveSmartLightMesh, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightMesh",
        family: "eve/smartLights",
        fields: {
          castShadows: [type.boolean, io.persist]
        }
      }), type.hideInherited(["partTag", "distribution"])], [[[io, io.persist, type, type.string], 16, "shaderParamColorName"], [[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.color], 16, "customColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base through its shared resolver.")], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")], 18, "SetColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiply-inherits EveSmartLightBaseGroup; JS flattens that base surface.")], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CjsModel emits Carbon-compatible BELIST codes; only an inserted modifier inherits the current color set.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript dispatches Carbon's two UpdateSyncronous overloads by argument count; the smart-light set owns the distribution.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript dispatches Carbon's two UpdateAsyncronous overloads by argument count.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNumberOfEntities"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The inherited Carbon method is exposed on this derived Blue class; JS also arms the derived distribution path's explicit deferred-work latch.")], 18, "RefreshStaticGeometry"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("TriGeometryRes exposes mesh validity through its maintained count contract instead of Carbon's native GetMeshData pointer.")], 18, "SetMeshColorParameter"]], 0, void 0, _EveChildInstanceMesh));
    }
    shaderParamColorName = (_initProto(this), _init_shaderParamColorName(this, ""));

    // Flattened EveSmartLightBaseGroup secondary base.

    factionColor = (_init_extra_shaderParamColorName(this), _init_factionColor(this, -1));
    useFactionColor = (_init_extra_factionColor(this), _init_useFactionColor(this, false));
    attributeModifiers = (_init_extra_useFactionColor(this), _init_attributeModifiers(this, []));
    customColor = (_init_extra_attributeModifiers(this), _init_customColor(this, vec4.createLinear()));

    /** Carbon m_castShadow is exposed under the canonical derived key. */
    get castShadows() {
      return this.castShadow;
    }

    /** Updates the inherited runtime flag through Carbon's derived key. */
    set castShadows(value) {
      this.castShadow = !!value;
    }

    /** Carbon m_parentColorSet, never persisted. */
    #parentColorSet = (_init_extra_customColor(this), null);

    /** Caller-owned faction-colour result; never aliases the SOF model. */
    #resolvedGroupColor = vec4.createLinear();

    /** Carbon m_lastAreaColor = (0,0,0,1). */
    #lastAreaColor = vec4.createLinear();

    /** A count/refresh skipped by the upload gate remains armed. */
    #geometryDirty = false;

    /** Faction-aware group color from the flattened secondary base. */
    GetGroupColor() {
      return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet, this.#resolvedGroupColor);
    }

    /** Overwrites the authored custom color. */
    SetColor(color) {
      vec4.copy(this.customColor, color);
    }

    /** Stores the inherited faction colors and updates every modifier directly. */
    SetInheritProperties(colorSet) {
      if (colorSet) {
        this.#parentColorSet = colorSet;
      }
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier.SetInheritProperties(colorSet);
      }
    }

    /** Fans a controller variable out to every modifier. */
    SetControllerVariable(name, value) {
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier.SetControllerVariable(name, value);
      }
    }

    /** Newly inserted modifiers receive the current inherited color set. */
    OnListModified(event, _key, _key2, value, list) {
      if (list === this.attributeModifiers && Number(event) === BELIST_INSERTED && this.#parentColorSet && value) {
        value.SetInheritProperties(this.#parentColorSet);
      }
    }

    /**
     * The two-argument EveChildMesh overload is a deliberate no-op. With the
     * third argument, the owning EveChildSmartLightSet supplies the distribution.
     */
    UpdateSyncronous(updateContext, params, distribution) {
      if (arguments.length < 3) {
        return;
      }
      _EveChildMesh.prototype.UpdateSyncronous.call(this, updateContext, params);
      if (!distribution || !this.display) {
        return;
      }
      const entityCount = Number(distribution.GetNumberOfPlacements()) >>> 0;
      const updateCount = this._lastEntityCount !== entityCount;
      this._lastEntityCount = entityCount;
      if (updateCount) this.#geometryDirty = true;
      if (entityCount === 0) {
        return;
      }
      const placements = distribution.GetPlacementData();
      const color = _EveSmartLightMesh.#color;
      vec4.scale(color, this.GetGroupColor(), this._GetActivationStrength());
      if (this.attributeModifiers.length) {
        const firstPlacement = _EveSmartLightMesh.#ClonePlacement(placements[0]);
        const firstRotation = _EveSmartLightMesh.#firstRotation;
        const firstRotationQuaternion = _EveSmartLightMesh.#firstRotationQuaternion;
        vec3.set(firstRotation, 0, 1, 0);
        // Carbon row-vector: initialRotation * additionalRotation.
        quat.multiply(firstRotationQuaternion, firstPlacement.additionalRotation, firstPlacement.initialRotation);
        vec3.transformQuat(firstRotation, firstRotation, firstRotationQuaternion);
        _EveSmartLightMesh.#TransformNormal(firstRotation, firstRotation, this.worldTransform);
        const center = distribution.GetPlacementDataCenter();
        for (const attributeModifier of this.attributeModifiers) {
          attributeModifier.ProcessAttributeModifier(_EveSmartLightMesh.#colorRgb, firstPlacement, center, firstRotation, params.activationStrength);
        }
      }
      this.SetMeshColorParameter(color);
      if (!(this.mesh instanceof _Tr2InstancedMesh)) {
        return;
      }
      if (!this.mesh.GetInstanceGeometryResource()) {
        this.ConfigureInstanceData();
        this.#geometryDirty = true;
      }
      const alwaysUpdate = distribution.GetHasDynamicMovement() || this.rotationConstraint !== RotationalConstraints.NONE;
      if (this.#geometryDirty || alwaysUpdate || this._refreshStaticGeometry) {
        const published = this.UpdateGeometryResource(placements, entityCount, updateContext.renderContext);
        this.UpdateBoundingSphere(placements, distribution);
        if (published) {
          this.#geometryDirty = false;
          this._refreshStaticGeometry = false;
        }
      }
    }

    /** Carbon's two-argument overload is a no-op; the three-argument one updates the mesh base. */
    UpdateAsyncronous(updateContext, params, _distribution) {
      if (arguments.length < 3) {
        return;
      }
      return super.UpdateAsyncronous(updateContext, params);
    }

    /** Forward to the instance renderer's two-stage visibility pass. */
    UpdateVisibility(updateContext, parentTransform, parentLod) {
      return super.UpdateVisibility(updateContext, parentTransform, parentLod);
    }

    /** Forward renderable collection to the instance renderer. */
    GetRenderables(renderables = []) {
      return super.GetRenderables(renderables);
    }

    /** Smart groups report the last set-owned distribution count. */
    GetNumberOfEntities() {
      return this._lastEntityCount;
    }

    /** Keeps SmartLightMesh's separate refresh latch armed as well. */
    RefreshStaticGeometry() {
      super.RefreshStaticGeometry();
      this.#geometryDirty = true;
    }

    /**
     * Applies a resolved group color to every Tr2Effect area, preserving Carbon's
     * path/display/resource/mesh-index guards and exact last-color cache.
     */
    SetMeshColorParameter(meshColor) {
      if (!this.shaderParamColorName || !this.display || vec4.exactEquals(this.#lastAreaColor, meshColor)) {
        return false;
      }
      if (!this.mesh) {
        return false;
      }
      const geometry = this.mesh.GetGeometryResource();
      if (!geometry || !geometry.IsGood()) {
        return false;
      }
      const meshIndex = this.mesh.GetMeshIndex();
      if (meshIndex < 0 || meshIndex >= geometry.GetMeshCount()) {
        return false;
      }
      if (!this.mesh.GetDisplay()) {
        return false;
      }
      for (const area of this.mesh.GetAllAreas()) {
        const effect = area.GetMaterialInterface();
        if (effect instanceof _Tr2Effect) {
          effect.SetParameter(this.shaderParamColorName, meshColor);
        }
      }
      vec4.copy(this.#lastAreaColor, meshColor);
      return true;
    }

    /** Clone Carbon's by-value first placement before modifiers see it. */

    /** Carbon TriVectorRotateMatrix: basis-only transform, no translation. */

    /** Carbon passes currentColor.GetXYZ(), so modifiers cannot mutate alpha. */
  }];
  #ClonePlacement(value) {
    const out = new _PlacementDataWithIde();
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
  #TransformNormal(out, direction, matrix) {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }
  #color = vec4.create();
  #colorRgb = _EveSmartLightMesh.#color.subarray(0, 3);
  #firstRotation = vec3.create();
  #firstRotationQuaternion = quat.create();
  constructor() {
    super(_EveSmartLightMesh), _initClass();
  }
}();

export { _EveSmartLightMesh as EveSmartLightMesh };
//# sourceMappingURL=EveSmartLightMesh.js.map
