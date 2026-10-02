import { ITr2BoundingBox } from "../../../../global/interfaces/ITr2BoundingBox.js";
import { IWorldPosition } from "../../../core/IWorldPosition.js";
import { ITr2SoundEmitterOwner } from "../../ITr2SoundEmitterOwner.js";
import { ITr2CurveSetOwner } from "../../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
// Source: trinity/trinity/Eve/EvePlanet.h
// Source: trinity/trinity/Eve/EvePlanet.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, edit, type } from "#schema";
import { EveEffectRoot2 } from "../EveEffectRoot2.js";
import { ITr2SecondaryLightSource } from "../../../core/lighting/ITr2SecondaryLightSource.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Represents a planet scene object with CPU-side visibility state for its depth-only child mesh. */
@type.define({ className: "EvePlanet", family: "eve/spaceObject" })
@carbon.mapInterface(ITr2SecondaryLightSource)
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
  @carbon.method
  @impl.adapted
  RegisterSecondaryLightSource(manager)
  {
    return manager.RegisterSecondaryLightSource(this._GetWorldTranslation(), () => this.radius, this.albedoColor, this.emissiveColor);
  }


  _renderScale = 1000000;

  /** m_zOnlyModel (EveChildMeshPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("EveChildMesh")
  zOnlyModel = null;

  /** m_emissiveColor (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  emissiveColor = vec4.create();

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  minScreenSize = 2;

  /** m_albedoColor (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  albedoColor = vec4.create();

  /** m_estimatedPixelDiameter (float) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.float32
  estimatedPixelDiameter = 0;

  /** m_radius (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  radius = 1;

  /** Stores the world-to-render scale used by Carbon's planet render path. */
  @carbon.method
  @impl.implemented
  SetRenderScale(value)
  {
    this._renderScale = Number(value);
  }

  /** Writes the render-scaled world-space bounds of the planet sphere. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  IsBoundingBoxReady()
  {
    return this.radius > 0;
  }

  /** Carbon EvePlanet::UpdateZOnlyVisibility (EvePlanet.cpp:133-139): forward
   * to the z-only child mesh with the UNSCALED protected world transform (NOT
   * the CalculatePlanetScaleTransform result - the depth-prepass proxy lives
   * in true world units, matching UpdateEffectChildren cpp:60-65) and the
   * current planet LOD (TR2_LOD_HIGH until the planet render path lands). No
   * gates whatsoever - the display / LOD-HIGH gates live downstream in
   * GetZOnlyRenderables (cpp:205-213). Scene call site:
   * EveSpaceScene.cpp:1458-1460 / EveSpaceScene.js UpdateVisibility. */
  @impl.implemented
  UpdateZOnlyVisibility(updateContext)
  {
    this.zOnlyModel?.UpdateVisibility(
      updateContext,
      this.GetWorldTransform(EvePlanet._worldTransformScratch),
      this.lodLevel
    );
  }

  static _worldTransformScratch = mat4.create();

}

// EvePlanet_Blue.cpp: native exposure; unported contracts: IEveEffectChildrenOwner, IShaderConfigurer.
carbon.interfaceTable({ interfaces: [EvePlanet, IEveSpaceObject2, ITr2SecondaryLightSource, ITr2CurveSetOwner, ITr2SoundEmitterOwner, IWorldPosition, ITr2BoundingBox], chainTo: EveEffectRoot2 })(EvePlanet, { kind: "class" });
