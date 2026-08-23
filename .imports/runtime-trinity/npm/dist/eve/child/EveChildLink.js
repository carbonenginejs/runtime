import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildMesh as _EveChildMesh } from './EveChildMesh.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_linkStrengthCurves, _init_extra_linkStrengthCurves, _init_linkStrengthBindings, _init_extra_linkStrengthBindings, _init_linkBarrier, _init_extra_linkBarrier, _init_currentDistance, _init_extra_currentDistance, _init_currentDirection, _init_extra_currentDirection, _init_target, _init_extra_target, _init_linkStrength, _init_extra_linkStrength, _init_targetRadius, _init_extra_targetRadius;

/**
 * A stretched link between a shield hull and an arc target: it orients itself
 * along the arc, keeps its own final world placement, and inherits the hull per-object values.
 */
let _EveChildLink;
new class extends _identity {
  static [class EveChildLink extends _EveChildMesh {
    static {
      ({
        e: [_init_linkStrengthCurves, _init_extra_linkStrengthCurves, _init_linkStrengthBindings, _init_extra_linkStrengthBindings, _init_linkBarrier, _init_extra_linkBarrier, _init_currentDistance, _init_extra_currentDistance, _init_currentDirection, _init_extra_currentDirection, _init_target, _init_extra_target, _init_linkStrength, _init_extra_linkStrength, _init_targetRadius, _init_extra_targetRadius, _initProto],
        c: [_EveChildLink, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildLink",
        family: "eve/child"
      })], [[[io, io.persist, void 0, type.list("ITriFunction")], 16, "linkStrengthCurves"], [[io, io.persist, void 0, type.list("ITr2ValueBinding")], 16, "linkStrengthBindings"], [[io, io.readwrite, type, type.float32], 16, "linkBarrier"], [[io, io.read, type, type.float32], 16, "currentDistance"], [[io, io.read, type, type.vec3], 16, "currentDirection"], [[io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "target"], [[io, io.read, type, type.float32], 16, "linkStrength"], [[io, io.readwrite, type, type.float32], 16, "targetRadius"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("EveChildMesh::UpdateSyncronous (animation/audio bookkeeping, EveChildMesh.cpp:1002) is not yet ported on the JS base, so only the link targeting runs; collaborators are duck-typed.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Per-object GPU buffer invalidation (cpp:143-144) is engine-owned; parents and curves are duck-typed and the vs/ps records are the backend-neutral value classes.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")], 18, "GetLocalToWorldTransform"]], 0, void 0, _EveChildMesh));
    }
    /** m_linkStrengthCurves (PITriFunctionVector) [READ, PERSIST] */
    linkStrengthCurves = (_initProto(this), _init_linkStrengthCurves(this, []));

    /** m_linkStrengthBindings (PITr2ValueBindingVector) [READ, PERSIST] */
    linkStrengthBindings = (_init_extra_linkStrengthCurves(this), _init_linkStrengthBindings(this, []));

    /** m_linkBarrier (float) [READWRITE] */
    linkBarrier = (_init_extra_linkStrengthBindings(this), _init_linkBarrier(this, 1));

    /** m_currentDistance (float) [READ] */
    currentDistance = (_init_extra_linkBarrier(this), _init_currentDistance(this, 0));

    /** m_currentDirection (Vector3) [READ] */
    currentDirection = (_init_extra_currentDistance(this), _init_currentDirection(this, vec3.fromValues(0, 0, 1)));

    /** m_target (ITriVectorFunctionPtr) [READWRITE] */
    target = (_init_extra_currentDirection(this), _init_target(this, null));

    /** m_linkStrength (float) [READ] */
    linkStrength = (_init_extra_target(this), _init_linkStrength(this, 0));

    /** m_targetRadius (float) [READWRITE] */
    targetRadius = (_init_extra_linkStrength(this), _init_targetRadius(this, 0.5));

    /** m_isVisible (bool, EveChildMesh) - result of the last UpdateVisibility pass. */
    #isVisible = (_init_extra_targetRadius(this), false);

    /**
     * Resolves the link direction and distance from the parent's model center to
     * the target function (EveChildLink.cpp:40-68).
     */
    UpdateSyncronous(updateContext, params) {
      // Carbon first calls EveChildMesh::UpdateSyncronous (EveChildLink.cpp:42);
      // the JS base class does not implement it yet - see the class reason.
      if (!this.target) {
        return;
      }
      const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0);
      const targetPosition = _EveChildLink.#targetPosition;
      vec3.set(targetPosition, 0, 0, 0);
      const targetResult = this.target.GetValueAt?.(time, targetPosition);
      if (targetResult && targetResult !== targetPosition && targetResult.length >= 3) {
        vec3.copy(targetPosition, targetResult);
      }
      if (!params?.spaceObjectParent) {
        // EveChildLink.cpp:57-60: without a source parent there is no direction.
        return;
      }
      const sourcePosition = _EveChildLink.#sourcePosition;
      vec3.set(sourcePosition, 0, 0, 0);
      const sourceResult = params.spaceObjectParent.GetModelCenterWorldPosition?.(sourcePosition);
      if (sourceResult && sourceResult !== sourcePosition && sourceResult.length >= 3) {
        vec3.copy(sourcePosition, sourceResult);
      }
      vec3.subtract(this.currentDirection, targetPosition, sourcePosition);
      this.currentDistance = vec3.length(this.currentDirection);
      vec3.normalize(this.currentDirection, this.currentDirection);
    }

    /**
     * Evaluates the link-strength curves/bindings, then composes the link
     * placement matrices and the per-object VS record
     * (EveChildLink.cpp:74-152). Replaces (does not call) the EveChildMesh
     * async update, as Carbon does.
     */
    UpdateAsyncronous(_updateContext, params) {
      // Update the special link curves with last frame's strength, then copy
      // the bound values (EveChildLink.cpp:76-85).
      for (const curve of this.linkStrengthCurves) {
        curve?.UpdateValue?.(this.linkStrength);
      }
      for (const binding of this.linkStrengthBindings) {
        binding?.CopyValue?.();
      }

      // Parent world matrix and the parent's shield ellipsoid offset
      // (EveChildLink.cpp:87-106).
      const shieldEllipsoidCenter = _EveChildLink.#shieldEllipsoidCenter;
      vec3.set(shieldEllipsoidCenter, 0, 0, 0);
      if (params?.childParent) {
        _EveChildLink.#CopyLocalToWorld(this.worldTransform, params.childParent);
      } else if (params?.spaceObjectParent) {
        _EveChildLink.#CopyLocalToWorld(this.worldTransform, params.spaceObjectParent);
        // Carbon queries the EveSpaceObject2 interface for GetShapeEllipsoid
        // (EveChildLink.cpp:96-101); parents without the duck-typed accessor
        // keep the zero center.
        params.spaceObjectParent.GetShapeEllipsoid?.(shieldEllipsoidCenter, _EveChildLink.#shieldEllipsoidRadii);
      } else {
        return;
      }

      // Link rotation arcs the authored +Y mesh axis onto the current direction
      // (EveChildLink.cpp:108-111, TriMatrixRotationArc).
      const linkRotation = _EveChildLink.#linkRotation;
      quat.rotationTo(_EveChildLink.#arcQuat, _EveChildLink.#meshDirection, this.currentDirection);
      mat4.fromQuat(linkRotation, _EveChildLink.#arcQuat);
      if (this.currentDistance <= this.targetRadius) {
        // Always at 100% within the target radius (EveChildLink.cpp:113-117).
        this.linkStrength = 1;
      } else {
        // Strength from distance vs. barrier (EveChildLink.cpp:119-123).
        const div = Math.abs(this.linkBarrier - this.targetRadius);
        this.linkStrength = Math.min(1, Math.max(0, 1 - (this.currentDistance - this.targetRadius) / div));
      }

      // Inverse rotation-only world matrix (EveChildLink.cpp:125-128).
      const inverseRotationWorld = _EveChildLink.#inverseRotationWorld;
      mat4.copy(inverseRotationWorld, this.worldTransform);
      inverseRotationWorld[12] = 0;
      inverseRotationWorld[13] = 0;
      inverseRotationWorld[14] = 0;
      if (!mat4.invert(inverseRotationWorld, inverseRotationWorld)) {
        // JS-only guard: Carbon inverts unconditionally.
        mat4.identity(inverseRotationWorld);
      }

      // Carbon (row-vector): linkRotationMat * invRotationWorldMat - linkRotationMat first. (EveChildLink.cpp:131)
      mat4.multiply(linkRotation, inverseRotationWorld, linkRotation);

      // Stamp the offset to the target into the translation row
      // (EveChildLink.cpp:133-135, TriMatrixOverwriteTranslation).
      linkRotation[12] = this.currentDistance * this.currentDirection[0];
      linkRotation[13] = this.currentDistance * this.currentDirection[1];
      linkRotation[14] = this.currentDistance * this.currentDirection[2];

      // Carbon (row-vector): TranslationMatrix(shieldEllipsoidCenter) * m_worldTransform - translate first. (EveChildLink.cpp:138-140)
      const finalWorld = _EveChildLink.#finalWorld;
      mat4.translate(finalWorld, this.worldTransform, shieldEllipsoidCenter);

      // Carbon cpp:143-151: invalidate, inherit the hull's structs, then stamp
      // the link's own placement into the records EveChildMesh owns - Carbon
      // inherits the same pair. worldTransformLast deliberately carries the LINK
      // ROTATION rather than the previous transform, so a stretched link resolves
      // its motion vector along the arc.
      const records = this.GetPerObjectRecords();
      records.vs.Invalidate();
      records.ps.Invalidate();
      params.spaceObjectParent?.GetPerObjectStructs?.(records.vs, records.ps);
      records.vs.SetAndTranspose("worldTransform", finalWorld);
      records.vs.SetAndTranspose("worldTransformLast", linkRotation);
    }

    /**
     * HOTFIX visibility from Carbon: never LOD out the tethering effect - a
     * present mesh is always visible (EveChildLink.cpp:154-169).
     */
    UpdateVisibility(_updateContext, _parentTransform, _parentLod) {
      if (!this.display) {
        return;
      }
      this.#isVisible = false;
      this.currentScreenSize = -1;
      if (this.mesh) {
        this.#isVisible = true;
      }
    }

    /**
     * Sphere at the center of the link: (direction, 1) * distance / 2
     * transformed by the world matrix (EveChildLink.cpp:171-178).
     */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      const halfDistance = this.currentDistance / 2;
      vec4.set(out, this.currentDirection[0] * halfDistance, this.currentDirection[1] * halfDistance, this.currentDirection[2] * halfDistance, halfDistance);
      sph3.transformMat4(out, out, this.worldTransform);
      return true;
    }

    /** Links never cast shadows (EveChildLink.cpp:180-183). */
    IsCastingShadow(_cameraFrustum, _shadowFrustum, _renderReason, _sizeInShadow) {
      return false;
    }

    /** Returns the local-to-world matrix (EveChildLink.cpp:189-192). */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /**
     * Copies a parent's local-to-world matrix into out, tolerating both the
     * out-parameter and the return-the-matrix JS signatures.
     */
  }];
  #CopyLocalToWorld(out, parent) {
    const source = parent.GetLocalToWorldTransform?.(out);
    if (source && source !== out && source.length === 16) {
      mat4.copy(out, source);
    }
    return out;
  }
  #meshDirection = vec3.fromValues(0, 1, 0);
  #arcQuat = quat.create();
  #linkRotation = mat4.create();
  #inverseRotationWorld = mat4.create();
  #finalWorld = mat4.create();
  #shieldEllipsoidCenter = vec3.create();
  #shieldEllipsoidRadii = vec3.create();
  #targetPosition = vec3.create();
  #sourcePosition = vec3.create();
  constructor() {
    super(_EveChildLink), _initClass();
  }
}();

export { _EveChildLink as EveChildLink };
//# sourceMappingURL=EveChildLink.js.map
