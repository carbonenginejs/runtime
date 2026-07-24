import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { EveChildTransform as _EveChildTransform, applyTransformModifiers } from '../EveChildTransform.js';
import { EveChildUpdateParams as _EveChildUpdateParams } from '../../EveChildUpdateParams.js';
import { Tr2Lod } from '../../EveLODHelper.js';

let _initProto, _initClass, _init_transformModifiers, _init_extra_transformModifiers, _init_selectedObject, _init_extra_selectedObject, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_selectionMethod, _init_extra_selectionMethod;

/** EveChildProceduralContainer (eve/child/procedural) - generated from schema shapeHash 91d6cbc5.... */
let _EveChildProceduralCo;
new class extends _identity {
  static [class EveChildProceduralContainer extends _EveChildTransform {
    static {
      ({
        e: [_init_transformModifiers, _init_extra_transformModifiers, _init_selectedObject, _init_extra_selectedObject, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_selectionMethod, _init_extra_selectionMethod, _initProto],
        c: [_EveChildProceduralCo, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildProceduralContainer",
        family: "eve/child/procedural"
      })], [[[io, io.persist, void 0, type.list("IEveChildTransformModifier")], 16, "transformModifiers"], [[io, io.read, void 0, type.objectRef("IEveSpaceObjectChild")], 16, "selectedObject"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.model("IEveProceduralSelectionMethod")], 16, "selectionMethod"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("ReRegister on display changes is engine-owned (component registry unported); the notify contract is preserved.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Entity Register/UnRegister against the component registry is engine-owned; the variable replay and swap are ported.")], 18, "ConfigureSelectedObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMethodVariableName"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProceduralContainerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayAllCurveSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopAllCurveSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindSoundEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddTransformModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_selectionMethod(this);
    }
    #proceduralContainerVariables = (_initProto(this), new Map());

    /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST] */
    transformModifiers = _init_transformModifiers(this, []);

    /** m_selectedObject (IEveSpaceObjectChildPtr) [READ] */
    selectedObject = (_init_extra_transformModifiers(this), _init_selectedObject(this, null));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_selectedObject(this), _init_name(this, ""));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_name(this), _init_display(this, true));

    /** m_selectionMethod (IEveProceduralSelectionMethodPtr) [READWRITE, PERSIST] */
    selectionMethod = (_init_extra_display(this), _init_selectionMethod(this, null));

    /** Carbon EveChildProceduralContainer::Initialize (cpp:29-32). */
    Initialize() {
      return true;
    }

    /** Carbon EveChildProceduralContainer::OnModified (cpp:313-320): a display
     * change re-registers with the scene component registry (engine-owned,
     * omitted). */
    OnModified(_value = null) {
      return true;
    }

    /** Carbon EveChildProceduralContainer::OnListModified (cpp:34-36) is an
     * intentional no-op. */
    OnListModified(_event = 0, _key = 0, _key2 = 0, _value = null, _list = null) {}

    /** Carbon method GetName (cpp:19-22). */
    GetName() {
      return this.name;
    }

    /** Carbon method SetName (cpp:24-27). */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /** Carbon EveChildProceduralContainer::ConfigureSelectedObject
     * (cpp:136-156): pull the newly selected child from the selection method,
     * replay the stored procedural variables into it, then swap it in. Carbon
     * also re-registers the entity with the scene component registry
     * (engine-owned, omitted). */
    ConfigureSelectedObject() {
      const child = this.selectionMethod?.GetSelectedChild?.() ?? null;
      if (child) {
        for (const [name, value] of this.#proceduralContainerVariables) {
          child.SetProceduralContainerVariable?.(name, value);
        }
      }
      this.selectedObject = child;
    }

    /** Carbon method GetMethodVariableName (MAP_METHOD_AND_WRAP). */
    GetMethodVariableName() {
      return this.selectionMethod?.GetProceduralMethodVariable?.() ?? "methodUnassigned";
    }

    /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
    HandleControllerEvent(name) {
      this.selectedObject?.HandleControllerEvent?.(name);
    }

    /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
    SetControllerVariable(name, value) {
      this.selectedObject?.SetControllerVariable?.(name, value);
    }

    /** Carbon method SetProceduralContainerVariable (MAP_METHOD_AND_WRAP). */
    SetProceduralContainerVariable(name, value) {
      const key = String(name);
      const next = Number(value);
      this.#proceduralContainerVariables.set(key, next);
      this.selectionMethod?.SetProceduralMethodVariable?.(key, next);
    }

    /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
    StartControllers() {
      this.selectedObject?.StartControllers?.();
    }

    /**
     * Sync-side frame update (Carbon EveChildProceduralContainer::
     * UpdateSyncronous, cpp:91-107): rebase the params onto this container's
     * world transform, tick the selected child, then reconfigure when the
     * selection method reports a change.
     * @param {Object} updateContext - frame context (EveUpdateContext)
     * @param {EveChildUpdateParams} params
     */
    UpdateSyncronous(updateContext, params) {
      const newParams = _EveChildProceduralCo.#DeriveChildParams(params);
      newParams.isVisible = params?.isVisible !== false && this.display;
      newParams.childParent = this;
      mat4.copy(newParams.localToWorldTransform, this.worldTransform);
      this.selectedObject?.UpdateSyncronous?.(updateContext, newParams);
      if (this.selectionMethod?.IsSelectedChildModified?.()) {
        this.ConfigureSelectedObject();
      }
    }

    /**
     * Per-frame async update (Carbon EveChildProceduralContainer::
     * UpdateAsyncronous, cpp:109-134): rebuild the world transform from the
     * parent (the Carbon row-vector m_localTransform * parentTransform
     * composition lives in EveChildTransform.UpdateTransform as
     * mat4.multiply(world, parent, local)), fold the transform modifiers, then
     * fan out to the selected child and the selection method.
     * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
     * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
     * @returns {Float32Array} worldTransform
     */
    UpdateAsyncronous(updateContext, params) {
      const parentTransform = params?.localToWorldTransform;
      if (parentTransform && parentTransform.length === 16) {
        this.UpdateTransform(parentTransform);
      }
      applyTransformModifiers(this, updateContext, params?.boneCount ?? 0, params?.bones ?? null);
      const newParams = _EveChildProceduralCo.#DeriveChildParams(params);
      newParams.isVisible = params?.isVisible !== false && this.display;
      newParams.childParent = this;
      mat4.copy(newParams.localToWorldTransform, this.worldTransform);
      this.selectedObject?.UpdateAsyncronous?.(updateContext, newParams);
      this.selectionMethod?.UpdateAsyncronous?.(updateContext, newParams);
      return this.worldTransform;
    }

    /** Carbon EveChildProceduralContainer::UpdateVisibility (cpp:38-49): gate on
     * display, then forward the unchanged parent transform/LOD to the selected
     * child. */
    UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH) {
      if (!this.display) {
        return;
      }
      this.selectedObject?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
    }

    /** Carbon EveChildProceduralContainer::GetRenderables (cpp:51-57). */
    GetRenderables(out = []) {
      if (this.display && this.selectedObject) {
        this.selectedObject.GetRenderables?.(out);
      }
      return out;
    }

    /** Carbon EveChildProceduralContainer::GetBoundingSphere (cpp:59-69): the
     * selected child's sphere or nothing. The child sphere is a per-call local
     * rather than module scratch because procedural containers nest through
     * their selected children; this is a bounds query, not the per-frame hot
     * path. */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      const childSphere = vec4.create();
      if (this.selectedObject?.GetBoundingSphere?.(childSphere)) {
        vec4.copy(out, childSphere);
        return true;
      }
      return false;
    }

    /** Carbon EveChildProceduralContainer::GetLocalToWorldTransform
     * (cpp:181-184); the optional out follows the EveChildContainer copy-out
     * shape. */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /** Carbon EveChildProceduralContainer::ChangeLOD (cpp:186-192). */
    ChangeLOD(lod) {
      this.selectedObject?.ChangeLOD?.(lod);
    }

    /** Carbon EveChildProceduralContainer::PlayCurveSet (cpp:194-200): the
     * ITr2CurveSetOwner dynamic_cast becomes a duck call on the selected
     * child. */
    PlayCurveSet(name, rangeName = "") {
      this.selectedObject?.PlayCurveSet?.(name, rangeName);
    }

    /** Carbon EveChildProceduralContainer::StopCurveSet (cpp:218-224). */
    StopCurveSet(name) {
      this.selectedObject?.StopCurveSet?.(name);
    }

    /** Carbon EveChildProceduralContainer::UpdateCurveSet (cpp:226-232). */
    UpdateCurveSet(name, time) {
      this.selectedObject?.UpdateCurveSet?.(name, time);
    }

    /** Carbon EveChildProceduralContainer::GetCurveSetDuration (cpp:234-244). */
    GetCurveSetDuration(name) {
      return Math.max(0, Number(this.selectedObject?.GetCurveSetDuration?.(name) ?? 0));
    }

    /** Carbon EveChildProceduralContainer::GetRangeDuration (cpp:246-256). */
    GetRangeDuration(name, rangeName) {
      return Math.max(0, Number(this.selectedObject?.GetRangeDuration?.(name, rangeName) ?? 0));
    }

    /** Carbon EveChildProceduralContainer::PlayAllCurveSets (cpp:202-208). */
    PlayAllCurveSets() {
      this.selectedObject?.PlayAllCurveSets?.();
    }

    /** Carbon EveChildProceduralContainer::StopAllCurveSets (cpp:210-216). */
    StopAllCurveSets() {
      this.selectedObject?.StopAllCurveSets?.();
    }

    /** Carbon EveChildProceduralContainer::Setup (cpp:258-261). */
    Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      return super.Setup(scale, rotation, translation, lowestLodVisible);
    }

    /** Carbon EveChildProceduralContainer::FindSoundEmitter (cpp:287-298): the
     * ITr2SoundEmitterOwner dynamic_cast becomes a duck call on the selected
     * child. */
    FindSoundEmitter(name) {
      return this.selectedObject?.FindSoundEmitter?.(name) ?? null;
    }

    /** Carbon EveChildProceduralContainer::AddTransformModifier
     * (cpp:300-303). */
    AddTransformModifier(modifier) {
      this.transformModifiers.push(modifier);
    }

    /** Carbon EveChildProceduralContainer::SetShaderOption (cpp:305-311). */
    SetShaderOption(name, value) {
      this.selectedObject?.SetShaderOption?.(name, value);
    }

    /** Carbon EveChildProceduralContainer::SetInheritProperties (cpp:346-356):
     * the IEveInheritPropertiesOwner BlueCast becomes a duck call. */
    SetInheritProperties(colorSet) {
      this.selectedObject?.SetInheritProperties?.(colorSet);
    }

    /** Carbon EveChildProceduralContainer::RegisterComponents (cpp:322-333):
     * forward-only to the selected object. Gate m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        this.selectedObject?.Register?.(registry);
      }
    }

    /** Carbon EveChildProceduralContainer::UnRegisterComponents (cpp:334-344):
     * forwards to the selected object; no display re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        this.selectedObject?.UnRegister?.(registry);
      }
    }

    // Copies the caller's params into a fresh child-facing record (Carbon copies
    // EveChildUpdateParams by value, cpp:93/120). Allocated per call like
    // EveChildContainer's fan-out - selected children can nest further
    // containers, making a module scratch record unsafe.
  }];
  #DeriveChildParams(params) {
    const next = new _EveChildUpdateParams();
    if (params) {
      next.spaceObjectParent = params.spaceObjectParent ?? null;
      next.childParent = params.childParent ?? null;
      next.boneCount = params.boneCount ?? 0;
      next.bones = params.bones ?? null;
      next.ownerMaxSpeed = Number(params.ownerMaxSpeed) || 0;
      next.activationStrength = Number(params.activationStrength ?? 1);
      next.controllerUpdateFrequency = Number(params.controllerUpdateFrequency ?? 0.5);
      next.isVisible = params.isVisible !== false;
      if (params.localToWorldTransform?.length === 16) {
        mat4.copy(next.localToWorldTransform, params.localToWorldTransform);
      }
      if (params.worldVelocity) {
        vec3.copy(next.worldVelocity, params.worldVelocity);
      }
    }
    return next;
  }
  constructor() {
    super(_EveChildProceduralCo), _initClass();
  }
}();

export { _EveChildProceduralCo as EveChildProceduralContainer };
//# sourceMappingURL=EveChildProceduralContainer.js.map
