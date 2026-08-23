// Source: trinity/trinity/Eve/EvePlanet.h
// Source: trinity/trinity/Eve/EvePlanet.cpp
// Hand-maintained after promotion from generated schema intake.
import { impl, io, type } from "#schema";
import { EveEffectRoot2 } from "../EveEffectRoot2.js";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";

/** Represents a planet scene object with CPU-side visibility state for its depth-only child mesh. */
@type.define({ className: "EvePlanet", family: "eve/spaceObject" })
export class EvePlanet extends EveEffectRoot2
{

  /** m_zOnlyModel (EveChildMeshPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveChildMesh")
  zOnlyModel = null;

  /** m_emissiveColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  emissiveColor = vec4.create();

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScreenSize = 2;

  /** m_albedoColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  albedoColor = vec4.create();

  /** m_estimatedPixelDiameter (float) [READ, PERSIST] */
  @io.persist
  @type.float32
  estimatedPixelDiameter = 0;

  /** m_radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 1;

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
    this.zOnlyModel?.UpdateVisibility?.(
      updateContext,
      this.GetWorldTransform(EvePlanet.#worldTransformScratch),
      this.lodLevel
    );
  }

  static #worldTransformScratch = mat4.create();

}
