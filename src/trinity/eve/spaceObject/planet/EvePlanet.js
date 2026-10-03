import { ITr2BoundingBox } from "../../../../global/interfaces/ITr2BoundingBox.js";
import { IWorldPosition } from "../../../core/IWorldPosition.js";
import { ITr2SoundEmitterOwner } from "../../ITr2SoundEmitterOwner.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
// Source: trinity/trinity/Eve/EvePlanet.h
// Source: trinity/trinity/Eve/EvePlanet.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { EveEffectRoot2 } from "../EveEffectRoot2.js";
import { ITr2SecondaryLightSource } from "../../../core/lighting/ITr2SecondaryLightSource.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildUpdateParams } from "../../EveChildUpdateParams.js";
import { Tr2Lod } from "../../EveLODHelper.js";
import { vec4 } from "#math/vec4";

/** A celestial effect root with scaled surface rendering and an ordinary-world depth proxy. */
@meta.define({ className: "EvePlanet", family: "eve/spaceObject" })
@meta.blue.mapInterface(ITr2SecondaryLightSource)
export class EvePlanet extends EveEffectRoot2
{
  /**
   * A planet lights its neighbours with its own radius, albedo and emissive
   * colour (EvePlanet.cpp:34-37); unregistering is EveEffectRoot2's, by the
   * same translation view.
   * Adapted: Carbon passes the radius as a pointer the manager reads live;
   * a getter supplies the current value at every source refresh.
   *
   * @param {import("../../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager} manager The scene's manager.
   * @returns {boolean} Whether the manager registered it.
   */
  @meta.blue.method
  @meta.adapted
  RegisterSecondaryLightSource(manager)
  {
    return manager.RegisterSecondaryLightSource(this._GetWorldTranslation(), () => this.radius, this.albedoColor, this.emissiveColor);
  }


  /** Carbon EvePlanet::SCALE (cpp:12), shared by scene and planet placement. */
  static scale = 1000000;

  _renderScale = EvePlanet.scale;
  _update = true;
  _estimatedMaxPixelDiameter = 0;

  /** m_zOnlyModel (EveChildMeshPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveChildMesh")
  zOnlyModel = null;

  /** m_emissiveColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  emissiveColor = vec4.create();

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = 2;

  /** m_albedoColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  albedoColor = vec4.create();

  /** m_estimatedPixelDiameter (float) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.float32
  estimatedPixelDiameter = 0;

  /** m_radius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  radius = 1;

  /** Stores the world-to-render scale used by Carbon's planet render path. */
  @meta.blue.method
  @meta.implemented
  SetRenderScale(value)
  {
    this._renderScale = value;
  }

  /** Writes the render-scaled world-space bounds of the planet sphere. */
  @meta.blue.method
  @meta.implemented
  GetWorldBoundingBox(min, max)
  {
    if (this.radius <= 0) return false;
    const renderScale = this._renderScale > 0 ? this._renderScale : 1;
    const transform = this.GetWorldTransform(EvePlanet._worldTransformScratch);
    const radius = this.radius / renderScale;
    const x = transform[12] / renderScale;
    const y = transform[13] / renderScale;
    const z = transform[14] / renderScale;
    vec3.set(min, x - radius, y - radius, z - radius);
    vec3.set(max, x + radius, y + radius, z + radius);
    return true;
  }

  /** Reports whether the planet radius can currently supply a bounding box. */
  @meta.blue.method
  @meta.implemented
  IsBoundingBoxReady()
  {
    return this.radius > 0;
  }

  /** Carbon EvePlanet::UpdateZOnlyVisibility (EvePlanet.cpp:133-139): forward
   * to the z-only child mesh with the UNSCALED protected world transform (NOT
   * the CalculatePlanetScaleTransform result - the depth-prepass proxy lives
   * in true world units, matching UpdateEffectChildren cpp:60-65) and the
   * current planet LOD. No
   * gates whatsoever - the display / LOD-HIGH gates live downstream in
   * GetZOnlyRenderables (cpp:205-213). Scene call site:
   * EveSpaceScene.cpp:1458-1460 / EveSpaceScene.js UpdateVisibility. */
  @meta.implemented
  UpdateZOnlyVisibility(updateContext)
  {
    this.zOnlyModel?.UpdateVisibility(
      updateContext,
      this.GetWorldTransform(EvePlanet._worldTransformScratch),
      this.lodLevel
    );
  }

  /**
   * Updates surface children in planet space and the depth proxy in world space
   * (EvePlanet.cpp:43-65). The depth proxy deliberately updates sync before async;
   * the surface children use the opposite order, exactly as Carbon does.
   */
  @meta.implemented
  UpdateEffectChildren(updateContext, worldTransform, renderScale)
  {
    const params = new EveChildUpdateParams();
    params.isVisible = this.display && this.lodLevel > Tr2Lod.TR2_LOD_LOW;
    this._CalculatePlanetScaleTransform(worldTransform, renderScale, params.localToWorldTransform);
    for (const child of this.effectChildren)
    {
      child.UpdateAsyncronous(updateContext, params);
      child.UpdateSyncronous(updateContext, params);
    }
    if (this.zOnlyModel)
    {
      mat4.copy(params.localToWorldTransform, worldTransform);
      this.zOnlyModel.UpdateSyncronous(updateContext, params);
      this.zOnlyModel.UpdateAsyncronous(updateContext, params);
    }
  }

  /**
   * Evaluates the ball plus authored translation/rotation, then the children,
   * curve sets, controllers and sun audio (EvePlanet.cpp:68-107).
   * Adapted: curve outputs are out-last and the explicit context carries renderer
   * state to curve sets; JavaScript runs the native work sequentially.
   */
  @meta.adapted
  UpdatePlanetSyncronous(updateContext, renderScale)
  {
    if (!this._update) return;
    const { vec3_0, quat_0 } = EvePlanet.scratch;
    vec3.set(vec3_0, 0, 0, 0);
    quat.identity(quat_0);
    const time = updateContext.GetTime();
    if (this.translationCurve) this.translationCurve.Update(time, vec3_0);
    if (this.rotationCurve) this.rotationCurve.Update(time, quat_0);
    vec3.add(vec3_0, vec3_0, this.translation);
    // Carbon (row-vector): ballRotation * m_rotation - ball first.
    quat.multiply(quat_0, this.rotation, quat_0);
    quat.normalize(quat_0, quat_0);
    mat4.fromRotationTranslationScale(this._worldTransform, quat_0, vec3_0, this.scaling);
    this.UpdateEffectChildren(updateContext, this._worldTransform, renderScale);
    for (const curveSet of this.curveSets) curveSet.Update(time, time, updateContext.renderContext);
    this.UpdateControllers(0.5);
    for (const observer of this.observers) observer.Update(this._worldTransform);
  }

  /**
   * Applies Carbon's world * ScalingMatrix(1/renderScale) (cpp:110-114).
   * Adapted: gl-matrix reverses the operands, including the translation scale;
   * the caller owns the output matrix instead of receiving a C++ value.
   */
  @meta.adapted
  _CalculatePlanetScaleTransform(worldTransform, renderScale, out)
  {
    const { mat4_0 } = EvePlanet.scratch;
    mat4.identity(mat4_0);
    mat4_0[0] = mat4_0[5] = mat4_0[10] = 1 / renderScale;
    // Carbon world * scale: gl-matrix applies world first, including translation.
    return mat4.multiply(out, mat4_0, worldTransform);
  }

  /**
   * Estimates size and visits children under the scaled transform (cpp:117-130).
   * Adapted: renderer globals come from updateContext.renderContext. As in Carbon,
   * size uses the renderer projection, while child culling uses the planet frustum.
   */
  @meta.adapted
  UpdatePlanetVisibility(updateContext, renderScale)
  {
    const transform = mat4.alloc();
    try
    {
      this._CalculatePlanetScaleTransform(this._worldTransform, renderScale, transform);
      const { vec3_0 } = EvePlanet.scratch;
      vec3.set(vec3_0, transform[12], transform[13], transform[14]);
      const context = updateContext.renderContext;
      this.estimatedPixelDiameter = this._EstimatePixelDiameterPos(vec3_0, 1 / context.GetProjection()[0], renderScale, context);
      this._estimatedMaxPixelDiameter = this._EstimatePixelDiameterPos(vec3_0, Math.tan(0.65 / 2), renderScale, context);
      for (const child of this.effectChildren) child.UpdateVisibility(updateContext, transform, this.lodLevel);
    }
    finally
    {
      mat4.unalloc(transform);
    }
  }

  /** Renderer position is explicit instead of global (EvePlanet.cpp:180-187). */
  @meta.adapted
  _EstimatePixelDiameterPos(center, tanFOV, scale, context)
  {
    return this._EstimatePixelDiameterDist(vec3.distance(center, context.GetViewPosition()), tanFOV, scale, context);
  }

  /** Renderer viewport is explicit; preserves both epsilon tests (cpp:199-221). */
  @meta.adapted
  _EstimatePixelDiameterDist(distance, tanFOV, scale, context)
  {
    const halfWidthProjection = context.GetViewport().width * 0.5 / tanFOV;
    const radius = this.radius / scale;
    if (distance < 1e-5) distance = 1e-5;
    if (radius < 1e-5) return 0;
    return radius / distance * halfWidthProjection * 2;
  }

  /** Surface drawing requires HIGH LOD and strictly more than minScreenSize (cpp:243-263). */
  @meta.implemented
  GetRenderables(renderables = [])
  {
    if (!this.display || this.lodLevel !== Tr2Lod.TR2_LOD_HIGH) return renderables;
    if (this.estimatedPixelDiameter > this.minScreenSize)
    {
      for (const child of this.effectChildren) child.GetRenderables(renderables);
    }
    return renderables;
  }

  /** The depth proxy has display/HIGH gates but no pixel-size gate (cpp:224-241). */
  @meta.implemented
  GetZOnlyRenderables(renderables = [])
  {
    if (this.display && this.lodLevel === Tr2Lod.TR2_LOD_HIGH && this.zOnlyModel)
    {
      this.zOnlyModel.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Returns the last visibility estimate (cpp:265-268). */
  @meta.implemented
  GetEstimatedPixelDiameter()
  {
    return this.estimatedPixelDiameter;
  }

  /** Returns the ball identity used to recognize the scene sun (cpp:270-273). */
  @meta.implemented
  GetTranslationCurve()
  {
    return this.translationCurve;
  }

  /** Applies the previous visibility estimate, preserving Carbon's frame ordering (cpp:275-291). */
  @meta.implemented
  UpdateLOD()
  {
    if (!this.display) return;
    this._SetLod(this.estimatedPixelDiameter > this.minScreenSize ? Tr2Lod.TR2_LOD_HIGH : Tr2Lod.TR2_LOD_LOW);
  }

  /** Propagates LOD to surface children and the depth proxy (cpp:293-307). */
  @meta.implemented
  _SetLod(lod)
  {
    this.lodLevel = lod;
    for (const child of this.effectChildren) child.ChangeLOD(lod);
    if (this.zOnlyModel) this.zOnlyModel.ChangeLOD(lod);
  }

  /** Returns the authored rotation, not the ball-composed root rotation (cpp:147-150). */
  @meta.adapted
  GetWorldRotation(out = quat.create()) // alloc: optional output is a caller-owned return value.
  {
    // Adapted: the caller owns the returned quaternion instead of a C++ value.
    return quat.copy(out, this.rotation);
  }

  /** The planet radius is independent of the effect-root bounding sphere (cpp:353-356). */
  @meta.implemented
  GetRadius()
  {
    return this.radius;
  }

  /** Planets expose one target point (cpp:315-318). */
  @meta.implemented
  GetDamageLocatorCount()
  {
    return 1;
  }

  /** Out-last JS target point: world translation or local zero (cpp:327-331). */
  @meta.adapted
  GetDamageLocatorPosition(_index, inWorldSpace, out)
  {
    if (inWorldSpace) this.GetWorldPosition(out);
    else vec3.set(out, 0, 0, 0);
    return true;
  }

  /** Out-last JS miss position is always the planet center (cpp:341-344). */
  @meta.adapted
  GetMissPosition(_hit, _source, out = vec3.create()) // alloc: optional output is a caller-owned return value.
  {
    return this.GetWorldPosition(out);
  }

  /** Native planet impact creation returns zero (cpp:359-362). */
  @meta.implemented
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    return 0;
  }

  /** A planet never supplies an impact position (cpp:371-374). */
  @meta.implemented
  GetImpactPosition(_locator, _posPrev, _posNow, _epsilon, _out)
  {
    return false;
  }

  static scratch = { vec3_0: vec3.create(), quat_0: quat.create(), mat4_0: mat4.create() };
  static _worldTransformScratch = mat4.create();

}

// EvePlanet_Blue.cpp: native exposure; unported contracts: IEveEffectChildrenOwner, IShaderConfigurer.
meta.blue.interfaceTable({ interfaces: [EvePlanet, IEveSpaceObject2, ITr2SecondaryLightSource, ITr2CurveSetOwner, ITr2SoundEmitterOwner, IWorldPosition, ITr2BoundingBox], chainTo: EveEffectRoot2 })(EvePlanet, { kind: "class" });
