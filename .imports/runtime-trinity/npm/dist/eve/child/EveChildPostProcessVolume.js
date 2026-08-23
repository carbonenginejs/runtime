import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2PostProcessAttributes as _Tr2PostProcessAttrib } from '../../postProcess/Tr2PostProcessAttributes.js';
import { EveComponentType } from '../EveComponentTypes.js';

let _initProto, _initClass, _init_volumes, _init_extra_volumes, _init_exclusionVolumes, _init_extra_exclusionVolumes, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_name, _init_extra_name, _init_postProcessAttributes, _init_extra_postProcessAttributes;

/** A child that unions a set of inclusion and exclusion volumes into a bounding sphere and drives a post-process effect's intensity from the camera's position relative to them. */
let _EveChildPostProcessV;
new class extends _identity {
  static [class EveChildPostProcessVolume extends _EveChildTransform {
    static {
      ({
        e: [_init_volumes, _init_extra_volumes, _init_exclusionVolumes, _init_extra_exclusionVolumes, _init_boundingSphereCenter, _init_extra_boundingSphereCenter, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_name, _init_extra_name, _init_postProcessAttributes, _init_extra_postProcessAttributes, _initProto],
        c: [_EveChildPostProcessV, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildPostProcessVolume",
        family: "eve/child"
      })], [[[io, io.persist, void 0, type.list("IEveVolume")], 16, "volumes"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "exclusionVolumes"], [[io, io.read, void 0, type.rawStruct("CcpMath::Sphere")], 16, "boundingSphereCenter"], [[io, io.read, void 0, type.rawStruct("CcpMath::Sphere")], 16, "boundingSphereRadius"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("Tr2PostProcessAttributes")], 16, "postProcessAttributes"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Volume bounding spheres arrive as duck-typed { center, radius } records rather than CcpMath::Sphere values.")], 18, "RebuildBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.noop], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateSyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAlwaysOn"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The Carbon constructor's attribute-instance creation (cpp:11-18) is deferred to first use because the generated field default stays null.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPostProcessAttributes"]], 0, void 0, _EveChildTransform));
    }
    /** m_volumes (PIEveVolumeVector) [READ, PERSIST] */
    volumes = (_initProto(this), _init_volumes(this, []));

    /** m_exclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
    exclusionVolumes = (_init_extra_volumes(this), _init_exclusionVolumes(this, []));

    /** m_boundingSphere.center (CcpMath::Sphere) [READ] */
    boundingSphereCenter = (_init_extra_exclusionVolumes(this), _init_boundingSphereCenter(this, null));

    /** m_boundingSphere.radius (CcpMath::Sphere) [READ] */
    boundingSphereRadius = (_init_extra_boundingSphereCenter(this), _init_boundingSphereRadius(this, null));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_boundingSphereRadius(this), _init_name(this, ""));

    /** m_postProcessAttributes (Tr2PostProcessAttributesPtr) [READWRITE, PERSIST] */
    postProcessAttributes = (_init_extra_name(this), _init_postProcessAttributes(this, null));

    // m_boundingSphere (CcpMath::Sphere) working state as a packed vec4; the
    // Carbon constructor initializes it to center (0,0,0), radius 0
    // (EveChildPostProcessVolume.cpp:11-18). The read-only mirror fields above
    // are refreshed after every rebuild.
    #boundingSphere = (_init_extra_postProcessAttributes(this), vec4.create());

    /**
     * Unions the volumes' bounding spheres into the object-space bound
     * (EveChildPostProcessVolume.cpp:24-60). The zeroed start sphere stays
     * "initialized" per CcpMath::Sphere semantics (radius >= 0,
     * Sphere_inline.h:33-36), so the result always includes the local origin -
     * matching Carbon exactly.
     */
    RebuildBoundingSphere() {
      const sphere = this.#boundingSphere;
      vec4.set(sphere, 0, 0, 0, 0);
      for (const volume of this.volumes) {
        const volumeSphere = volume?.GetBoundingSphere?.();
        const center = volumeSphere?.center;
        const radius = Number(volumeSphere?.radius);
        if (!center || !(radius >= 0)) {
          // Sphere::IsInitialized is radius >= 0 (Sphere_inline.h:33-36).
          continue;
        }
        const dx = center[0] - sphere[0];
        const dy = center[1] - sphere[1];
        const dz = center[2] - sphere[2];
        const distanceSq = dx * dx + dy * dy + dz * dz;
        if (radius >= sphere[3] && distanceSq <= (radius - sphere[3]) * (radius - sphere[3])) {
          // volumeSphere.IsSphereInside(m_boundingSphere) - copy it (cpp:42-46).
          vec4.set(sphere, center[0], center[1], center[2], radius);
          continue;
        }
        if (sphere[3] >= radius && distanceSq <= (sphere[3] - radius) * (sphere[3] - radius)) {
          // m_boundingSphere.IsSphereInside(volumeSphere) - no update (cpp:48-51).
          continue;
        }
        // Extend the sphere (cpp:54-58). The contains checks above exclude the
        // coincident-center case, so deltaLen > 0 here, as in Carbon.
        const deltaLen = Math.sqrt(distanceSq);
        const centerScale = 0.5 * (1 + (radius - sphere[3]) / deltaLen);
        sphere[0] += centerScale * dx;
        sphere[1] += centerScale * dy;
        sphere[2] += centerScale * dz;
        sphere[3] = 0.5 * (sphere[3] + radius + deltaLen);
      }
      this.#MirrorBoundingSphere();
    }
    /**
     * The volume's name.
     */
    GetName() {
      return this.name;
    }
    /**
     * Sets the volume's name, coercing the value to a string.
     */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /** Carbon's visibility pass is empty (EveChildPostProcessVolume.cpp:84-86). */
    UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

    /** Post-process volumes publish no renderables (EveChildPostProcessVolume.h:40). */
    GetRenderables(renderables = []) {
      return renderables;
    }

    /** Copies the object-space bound (EveChildPostProcessVolume.cpp:88-94). */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      vec4.copy(out, this.#boundingSphere);
      return true;
    }

    /** Carbon's synchronous pass is empty (EveChildPostProcessVolume.cpp:96-98). */
    UpdateSyncronous(_updateContext, _params) {}

    /**
     * Per-frame async update (EveChildPostProcessVolume.cpp:100-151): refresh
     * the transform and bound, then resolve the post-process intensity from the
     * camera position against the inclusion and exclusion volumes.
     */
    UpdateAsyncronous(updateContext, params) {
      this.#UpdateTransformFromParent(params);
      this.RebuildBoundingSphere();
      const attributes = this.#EnsureAttributes();

      // Global postprocess volumes have no volumes, so they are always on
      // (cpp:108-112).
      if (this.volumes.length === 0) {
        attributes.intensity = 1;
        return;
      }
      attributes.intensity = 0;
      const viewPosition = updateContext?.renderContext?.GetViewPosition?.();
      if (!viewPosition) {
        return;
      }
      if (!mat4.invert(_EveChildPostProcessV.#inverseWorld, this.worldTransform)) {
        // JS-only guard: Carbon inverts unconditionally; a singular world
        // transform keeps the volume off for the frame.
        return;
      }
      const cameraInObjectSpace = vec3.transformMat4(_EveChildPostProcessV.#cameraInObjectSpace, viewPosition, _EveChildPostProcessV.#inverseWorld);

      // Sphere::IsPointInside with radiusEpsilon 1e-4 (Sphere_inline.h:107-117).
      const sphere = this.#boundingSphere;
      const dx = cameraInObjectSpace[0] - sphere[0];
      const dy = cameraInObjectSpace[1] - sphere[1];
      const dz = cameraInObjectSpace[2] - sphere[2];
      if (!(sphere[3] >= 0) || dx * dx + dy * dy + dz * dz > sphere[3] * sphere[3] + 1e-4) {
        return;
      }

      // Find the intensity within the volumes (cpp:123-132).
      for (const volume of this.volumes) {
        attributes.intensity = Math.max(attributes.intensity, Number(volume?.GetIntensity?.(cameraInObjectSpace)) || 0);
        if (attributes.intensity === 1) {
          break;
        }
      }
      if (attributes.intensity !== 0) {
        // Subtract the exclusion volumes' intensity (cpp:134-148).
        let negativeIntensity = 0;
        for (const volume of this.exclusionVolumes) {
          negativeIntensity = Math.max(negativeIntensity, Number(volume?.GetIntensity?.(cameraInObjectSpace)) || 0);
          if (negativeIntensity === 1) {
            break;
          }
        }
        attributes.intensity = Math.max(0, attributes.intensity - negativeIntensity);
      }
    }

    /** Carbon's implementation is empty (EveChildPostProcessVolume.cpp:160-162). */
    GetLocalToWorldTransform(_out = null) {}

    /** Forwards to the base transform setup (EveChildPostProcessVolume.cpp:164-168). */
    Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      return super.Setup(scale, rotation, translation, lowestLodVisible);
    }
    /**
     * Always true: the volume stays active regardless of where the camera is.
     */
    IsAlwaysOn() {
      return true;
    }

    /** Builds the initial bound (EveChildPostProcessVolume.cpp:177-181). */
    Initialize() {
      this.#EnsureAttributes();
      this.RebuildBoundingSphere();
      return true;
    }

    /** Carbon EveChildPostProcessVolume::RegisterComponents (cpp:62-65):
     * unconditional PostProcessOwner leaf self-registration. Carbon's
     * UnRegisterComponents (cpp:67-70) only removes this same component, which
     * EveEntity::UnRegister already did via UnRegisterAllComponents
     * (EveEntity.cpp:90), so the JS un-side keeps the base no-op. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.PostProcessOwner, this);
      }
    }

    /** Returns the owned attribute record (EveChildPostProcessVolume.cpp:217-220). */
    GetPostProcessAttributes() {
      return this.#EnsureAttributes();
    }

    /** Rebuilds the world transform from the parent (EveChildPostProcessVolume.cpp:153-158). */
    #UpdateTransformFromParent(params) {
      const parentTransform = params?.localToWorldTransform;
      if (parentTransform && parentTransform.length === 16) {
        this.UpdateTransform(parentTransform);
      }
    }

    /**
     * Lazily creates the attribute record the Carbon constructor allocates with
     * zero intensity (EveChildPostProcessVolume.cpp:11-18).
     */
    #EnsureAttributes() {
      if (!this.postProcessAttributes) {
        this.postProcessAttributes = new _Tr2PostProcessAttrib();
        this.postProcessAttributes.intensity = 0;
      }
      return this.postProcessAttributes;
    }

    /** Refreshes the schema's read-only center/radius mirrors from the packed bound. */
    #MirrorBoundingSphere() {
      if (!this.boundingSphereCenter) {
        this.boundingSphereCenter = vec3.create();
      }
      vec3.set(this.boundingSphereCenter, this.#boundingSphere[0], this.#boundingSphere[1], this.#boundingSphere[2]);
      this.boundingSphereRadius = this.#boundingSphere[3];
    }
  }];
  #inverseWorld = mat4.create();
  #cameraInObjectSpace = vec3.create();
  constructor() {
    super(_EveChildPostProcessV), _initClass();
  }
}();

export { _EveChildPostProcessV as EveChildPostProcessVolume };
//# sourceMappingURL=EveChildPostProcessVolume.js.map
