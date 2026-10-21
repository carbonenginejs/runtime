import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/EveChildProceduralContainer.h
import { INotify } from "../../../../global/blue/INotify.js";
import { IShaderConfigurer } from "../../../shader/IShaderConfigurer.js";
import { EveEntity } from "../../EveEntity.js";
import { ITr2SoundEmitterOwner } from "../../ITr2SoundEmitterOwner.js";
import { IListNotify } from "../../../../global/blue/IListNotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "../IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "../EveSpaceObjectChild.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { CjsSchema, meta, type, blue } from "#schema";
import { IsMatch } from "#blue";
import { quat } from "#math/quat";
import { IEveInheritPropertiesOwner } from "../../IEveInheritPropertiesOwner.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveChildTransform, applyTransformModifiers } from "../EveChildTransform.js";
import { EveChildUpdateParams } from "../../EveChildUpdateParams.js";
import { Tr2Lod } from "../../EveLODHelper.js";

/** EveChildProceduralContainer (eve/child/procedural) - generated from schema shapeHash 91d6cbc5.... */
@be.define("EveChildProceduralContainer")
@blue.inherit(ITr2CurveSetOwner, IEveInheritPropertiesOwner, ITr2SoundEmitterOwner)
@blue.inherit(IInitialize, IListNotify, INotify)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(ITr2CurveSetOwner)
@be.mapInterface(IInitialize)
@be.mapInterface(IListNotify)
@be.mapInterface(ITr2SoundEmitterOwner)
@be.mapInterface(IEveInheritPropertiesOwner)
@be.mapInterface(EveEntity)
@be.mapInterface(IShaderConfigurer)
export class EveChildProceduralContainer extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildProceduralContainer_Blue.cpp:24 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildProceduralContainer_Blue.cpp:25 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildProceduralContainer_Blue.cpp:26 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_localTransform (Matrix) [READWRITE, PERSIST] (EveChildProceduralContainer_Blue.cpp:27) */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  localTransform = mat4.create();

  _proceduralContainerVariables = new Map();

  /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_selectedObject (IEveSpaceObjectChildPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("IEveSpaceObjectChild")
  selectedObject = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  /** m_selectionMethod (IEveProceduralSelectionMethodPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("IEveProceduralSelectionMethod")
  selectionMethod = null;

  /** Carbon EveChildProceduralContainer::Initialize (cpp:29-32). */

  @meta.implemented
  Initialize()
  {
    return true;
  }

  /**
   * Carbon EveChildProceduralContainer::OnModified (cpp:306-313): a display
   * change re-registers with the scene component registry.
   *
   * @param {*} [value=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */

  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "display"))
    {
      this.ReRegister();
    }
    return true;
  }

  /** Carbon EveChildProceduralContainer::OnListModified (cpp:34-36) is an
   * intentional no-op. */

  @meta.implemented
  OnListModified(_event = 0, _key = 0, _key2 = 0, _value = null, _list = null)
  {
  }

  /** Carbon method GetName (cpp:19-22). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetName (cpp:24-27). */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Carbon EveChildProceduralContainer::ConfigureSelectedObject
   * (cpp:127-149): pull the newly selected child from the selection method
   * and replay the stored procedural variables into it, then swap it in -
   * the old object leaves the component registry and the child hierarchy,
   * the new one joins both. The only caller checks the selection method first
   * (cpp:94-97).
   */

  @meta.implemented
  ConfigureSelectedObject()
  {
    const child = this.selectionMethod.GetSelectedChild();
    if (child)
    {
      for (const [name, value] of this._proceduralContainerVariables)
      {
        child.SetProceduralContainerVariable(name, value);
      }
    }

    const registry = this.GetComponentRegistry();
    const previous = CjsSchema.cast(this.selectedObject, EveEntity);
    if (previous)
    {
      previous.UnRegister(registry);
    }
    this.UnregisterChild(this.selectedObject);

    this.selectedObject = child;

    this.RegisterChild(this.selectedObject);
    const next = CjsSchema.cast(this.selectedObject, EveEntity);
    if (next)
    {
      next.Register(registry);
    }
  }

  /**
   * Carbon EveChildProceduralContainer::RegisterWithQuadRenderer (cpp:62-68):
   * forwards to the selected object.
   * @param {Tr2QuadRenderer} quadRenderer
   */

  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.selectedObject !== null)
    {
      this.selectedObject.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /**
   * Carbon EveChildProceduralContainer::AddQuadsToQuadRenderer (cpp:70-81):
   * forwards to the selected object while displayed.
   * @param {TriFrustum} frustum
   * @param {Tr2QuadRenderer} quadRenderer
   */

  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display)
    {
      return;
    }

    if (this.selectedObject !== null)
    {
      this.selectedObject.AddQuadsToQuadRenderer(frustum, quadRenderer);
    }
  }

  /**
   * Carbon EveChildProceduralContainer::SetOwner (cpp:386-396): a change of
   * owner also reaches the selected object.
   * @param {IEveSpaceObject2|null} owner
   */

  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() !== owner)
    {
      super.SetOwner(owner);
      if (this.selectedObject)
      {
        this.selectedObject.SetOwner(owner);
      }
    }
  }

  /**
   * Carbon EveChildProceduralContainer::SetPartTag (cpp:398-408): a change of
   * part tag also reaches the selected object.
   * @param {number} tag
   */

  @meta.implemented
  SetPartTag(tag)
  {
    if (this.GetPartTag() !== tag)
    {
      super.SetPartTag(tag);
      if (this.selectedObject)
      {
        this.selectedObject.SetPartTag(tag);
      }
    }
  }

  /** Carbon method GetMethodVariableName (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetMethodVariableName()
  {
    return this.selectionMethod ? this.selectionMethod.GetProceduralMethodVariable() : "methodUnassigned";
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  HandleControllerEvent(name)
  {
    this.selectedObject?.HandleControllerEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetControllerVariable(name, value)
  {
    this.selectedObject?.SetControllerVariable(name, value);
  }

  /** Carbon method SetProceduralContainerVariable (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetProceduralContainerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this._proceduralContainerVariables.set(key, next);
    if (this.selectionMethod) this.selectionMethod.SetProceduralMethodVariable(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.implemented
  StartControllers()
  {
    this.selectedObject?.StartControllers();
  }

  /**
   * Sync-side frame update (Carbon EveChildProceduralContainer::
   * UpdateSyncronous, cpp:91-107): rebase the params onto this container's
   * world transform, tick the selected child, then reconfigure when the
   * selection method reports a change.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {EveChildUpdateParams} params
   */

  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    const newParams = EveChildProceduralContainer._DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this.selectedObject?.UpdateSyncronous(updateContext, newParams);

    if (this.selectionMethod && this.selectionMethod.IsSelectedChildModified())
    {
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
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
   * @returns {Float32Array} worldTransform
   */

  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    const parentTransform = params?.localToWorldTransform;

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    applyTransformModifiers(this, params?.boneCount ?? 0, params?.bones ?? null);

    const newParams = EveChildProceduralContainer._DeriveChildParams(params);
    newParams.isVisible = (params?.isVisible !== false) && this.display;
    newParams.childParent = this;
    mat4.copy(newParams.localToWorldTransform, this.worldTransform);

    this.selectedObject?.UpdateAsyncronous(updateContext, newParams);

    if (this.selectionMethod) this.selectionMethod.UpdateAsyncronous(updateContext, newParams);

    return this.worldTransform;
  }

  /** Carbon EveChildProceduralContainer::UpdateVisibility (cpp:38-49): gate on
   * display, then forward the unchanged parent transform/LOD to the selected
   * child. */

  @meta.implemented
  UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    if (!this.display)
    {
      return;
    }

    this.selectedObject?.UpdateVisibility(updateContext, parentTransform, parentLod);
  }

  /** Carbon EveChildProceduralContainer::GetRenderables (cpp:51-57). */

  @meta.implemented
  GetRenderables(out = [])
  {
    if (this.display && this.selectedObject)
    {
      this.selectedObject.GetRenderables(out);
    }
    return out;
  }

  /** Carbon EveChildProceduralContainer::GetBoundingSphere (cpp:59-69): the
   * selected child's sphere or nothing. The child sphere is a per-call local
   * rather than module scratch because procedural containers nest through
   * their selected children; this is a bounds query, not the per-frame hot
   * path. */

  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    const childSphere = vec4.create();
    if (this.selectedObject && this.selectedObject.GetBoundingSphere(childSphere, 0))
    {
      vec4.copy(out, childSphere);
      return true;
    }
    return false;
  }

  /**
   * Carbon GetLocalToWorldTransform( Matrix& ) (EveChildProceduralContainer.cpp:181-184): copies the world transform into out, and returns out.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */

  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    return mat4.copy(out, this.worldTransform);
  }

  /** Carbon EveChildProceduralContainer::ChangeLOD (cpp:186-192). */

  @meta.implemented
  ChangeLOD(lod)
  {
    if (this.selectedObject) this.selectedObject.ChangeLOD(lod);
  }

  /** Carbon EveChildProceduralContainer::PlayCurveSet (cpp:187-193): the selected child, when it owns curve sets. */

  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    if (owner) owner.PlayCurveSet(name, rangeName);
  }

  /** Carbon EveChildProceduralContainer::StopCurveSet (cpp:218-224). */

  @meta.implemented
  StopCurveSet(name)
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    if (owner) owner.StopCurveSet(name);
  }

  /** Carbon EveChildProceduralContainer::UpdateCurveSet (cpp:226-232). */

  @meta.implemented
  UpdateCurveSet(name, time)
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    if (owner) owner.UpdateCurveSet(name, time);
  }

  /** Carbon EveChildProceduralContainer::GetCurveSetDuration (cpp:234-244). */

  @meta.implemented
  GetCurveSetDuration(name)
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    return owner ? Math.max(0, owner.GetCurveSetDuration(name)) : 0;
  }

  /** Carbon EveChildProceduralContainer::GetRangeDuration (cpp:246-256). */

  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    return owner ? Math.max(0, owner.GetRangeDuration(name, rangeName)) : 0;
  }

  /** Carbon EveChildProceduralContainer::PlayAllCurveSets (cpp:202-208). */

  @meta.implemented
  PlayAllCurveSets()
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    if (owner) owner.PlayAllCurveSets();
  }

  /** Carbon EveChildProceduralContainer::StopAllCurveSets (cpp:210-216). */

  @meta.implemented
  StopAllCurveSets()
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2CurveSetOwner);
    if (owner) owner.StopAllCurveSets();
  }

  /** Carbon EveChildProceduralContainer::Setup (cpp:258-261). */

  @meta.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /** Carbon EveChildProceduralContainer::FindSoundEmitter (cpp:287-298): the
   * selected child through Carbon's ITr2SoundEmitterOwner dynamic_cast. */

  @meta.implemented
  FindSoundEmitter(name)
  {
    const owner = CjsSchema.cast(this.selectedObject, ITr2SoundEmitterOwner);
    return owner ? owner.FindSoundEmitter(name) : null;
  }

  /** Carbon EveChildProceduralContainer::AddTransformModifier
   * (cpp:300-303). */

  @meta.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /** Carbon EveChildProceduralContainer::SetShaderOption (cpp:305-311). */

  @meta.implemented
  SetShaderOption(name, value)
  {
    if (this.selectedObject) this.selectedObject.SetShaderOption(name, value);
  }

  /** Carbon EveChildProceduralContainer::SetInheritProperties (cpp:346-356):
   * the IEveInheritPropertiesOwner BlueCast is the instanceof gate. */

  @meta.implemented
  SetInheritProperties(colorSet)
  {
    if (CjsSchema.cast(this.selectedObject, IEveInheritPropertiesOwner)) this.selectedObject.SetInheritProperties(colorSet);
  }

  /** Carbon EveChildProceduralContainer::RegisterComponents (cpp:322-333):
   * forward-only to the selected object. Gate m_display. */

  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      this.selectedObject?.Register(registry);
    }
  }

  /** Carbon EveChildProceduralContainer::UnRegisterComponents (cpp:334-344):
   * forwards to the selected object; no display re-check. */

  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      this.selectedObject?.UnRegister(registry);
    }
  }

  // Copies the caller's params into a fresh child-facing record (Carbon copies
  // EveChildUpdateParams by value, cpp:93/120). Allocated per call like
  // EveChildContainer's fan-out - selected children can nest further
  // containers, making a module scratch record unsafe.

  /**
   * Copies the caller's update params into a fresh child-facing record (Carbon
   * passes EveChildUpdateParams by value, cpp:93/120); allocated per call
   * because a selected child can itself nest further containers, making a shared
   * module scratch record unsafe.
   */
  static _DeriveChildParams(params)
  {
    const next = new EveChildUpdateParams();
    if (params)
    {
      next.spaceObjectParent = params.spaceObjectParent ?? null;
      next.childParent = params.childParent ?? null;
      next.boneCount = params.boneCount ?? 0;
      next.bones = params.bones ?? null;
      next.ownerMaxSpeed = Number(params.ownerMaxSpeed) || 0;
      next.activationStrength = Number(params.activationStrength ?? 1);
      next.controllerUpdateFrequency = Number(params.controllerUpdateFrequency ?? 0.5);
      next.isVisible = params.isVisible !== false;
      if (params.localToWorldTransform?.length === 16)
      {
        mat4.copy(next.localToWorldTransform, params.localToWorldTransform);
      }
      if (params.worldVelocity)
      {
        vec3.copy(next.worldVelocity, params.worldVelocity);
      }
    }
    return next;
  }

}

// EveChildProceduralContainer_Blue.cpp: native exposure; unported contracts: IShaderConfigurer.
