import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEffectRoot2 as _EveEffectRoot } from '../EveEffectRoot2.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_zOnlyModel, _init_extra_zOnlyModel, _init_emissiveColor, _init_extra_emissiveColor, _init_minScreenSize, _init_extra_minScreenSize, _init_albedoColor, _init_extra_albedoColor, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_radius, _init_extra_radius;

/** Represents a planet scene object with CPU-side visibility state for its depth-only child mesh. */
let _EvePlanet;
new class extends _identity {
  static [class EvePlanet extends _EveEffectRoot {
    static {
      ({
        e: [_init_zOnlyModel, _init_extra_zOnlyModel, _init_emissiveColor, _init_extra_emissiveColor, _init_minScreenSize, _init_extra_minScreenSize, _init_albedoColor, _init_extra_albedoColor, _init_estimatedPixelDiameter, _init_extra_estimatedPixelDiameter, _init_radius, _init_extra_radius, _initProto],
        c: [_EvePlanet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EvePlanet",
        family: "eve/spaceObject"
      })], [[[io, io.persist, void 0, type.model("EveChildMesh")], 16, "zOnlyModel"], [[io, io.persist, type, type.color], 16, "emissiveColor"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.persist, type, type.color], 16, "albedoColor"], [[io, io.persist, type, type.float32], 16, "estimatedPixelDiameter"], [[io, io.persist, type, type.float32], 16, "radius"], [[impl, impl.implemented], 18, "UpdateZOnlyVisibility"]], 0, void 0, _EveEffectRoot));
    }
    constructor(...args) {
      super(...args);
      _init_extra_radius(this);
    }
    /** m_zOnlyModel (EveChildMeshPtr) [READWRITE, PERSIST] */
    zOnlyModel = (_initProto(this), _init_zOnlyModel(this, null));

    /** m_emissiveColor (Color) [READWRITE, PERSIST] */
    emissiveColor = (_init_extra_zOnlyModel(this), _init_emissiveColor(this, vec4.create()));

    /** m_minScreenSize (float) [READWRITE, PERSIST] */
    minScreenSize = (_init_extra_emissiveColor(this), _init_minScreenSize(this, 2));

    /** m_albedoColor (Color) [READWRITE, PERSIST] */
    albedoColor = (_init_extra_minScreenSize(this), _init_albedoColor(this, vec4.create()));

    /** m_estimatedPixelDiameter (float) [READ, PERSIST] */
    estimatedPixelDiameter = (_init_extra_albedoColor(this), _init_estimatedPixelDiameter(this, 0));

    /** m_radius (float) [READWRITE, PERSIST] */
    radius = (_init_extra_estimatedPixelDiameter(this), _init_radius(this, 1));

    /** Carbon EvePlanet::UpdateZOnlyVisibility (EvePlanet.cpp:133-139): forward
     * to the z-only child mesh with the UNSCALED protected world transform (NOT
     * the CalculatePlanetScaleTransform result - the depth-prepass proxy lives
     * in true world units, matching UpdateEffectChildren cpp:60-65) and the
     * current planet LOD (TR2_LOD_HIGH until the planet render path lands). No
     * gates whatsoever - the display / LOD-HIGH gates live downstream in
     * GetZOnlyRenderables (cpp:205-213). Scene call site:
     * EveSpaceScene.cpp:1458-1460 / EveSpaceScene.js UpdateVisibility. */
    UpdateZOnlyVisibility(updateContext) {
      this.zOnlyModel?.UpdateVisibility?.(updateContext, this.GetWorldTransform(_EvePlanet.#worldTransformScratch), this.lodLevel);
    }
  }];
  #worldTransformScratch = mat4.create();
  constructor() {
    super(_EvePlanet), _initClass();
  }
}();

export { _EvePlanet as EvePlanet };
//# sourceMappingURL=EvePlanet.js.map
