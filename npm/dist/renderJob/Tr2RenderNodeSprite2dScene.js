import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_scene, _init_extra_scene, _init_background, _init_extra_background;

/** A render-graph node that draws a sprite scene into a destination texture, over an optional background node. */
let _Tr2RenderNodeSprite;
class Tr2RenderNodeSprite2dScene extends CjsModel {
  static {
    ({
      e: [_init_scene, _init_extra_scene, _init_background, _init_extra_background, _initProto],
      c: [_Tr2RenderNodeSprite, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RenderNodeSprite2dScene",
      family: "renderJob"
    })], [[[io, io.persist, void 0, type.model("Tr2Sprite2dScene")], 16, "scene"], [[io, io.persist, void 0, type.model("ITr2RenderNode")], 16, "background"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon asserts before returning false on an empty destination list; the port returns false without asserting and lets the caller decide.")], 18, "Validate"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_background(this);
  }
  /** m_scene (Tr2Sprite2dScenePtr) [READWRITE, PERSIST] */
  scene = (_initProto(this), _init_scene(this, null));

  /** m_background (ITr2RenderNodePtr) [READWRITE, PERSIST] */
  background = (_init_extra_scene(this), _init_background(this, null));

  // Carbon Tr2RenderNodeSprite2dScene.cpp:8-26. The node refuses to run
  // without somewhere to draw and something to draw, and a background node
  // must validate against the same destinations before this one does - a
  // background that cannot render would otherwise be discovered mid-frame.
  //
  // Carbon asserts on an empty destination list and then returns false; an
  // assert is a debug-build stop, so this port returns false in both builds
  // and the caller decides how loudly to fail.
  //
  // Execute is not here: it draws the scene through the backend context.

  /**
   * Whether this node can run against the given destinations, requiring at
   * least one destination, a scene, and a background that validates first.
   */
  Validate(destinationDimensions, outputs, realTime, simTime) {
    if (!destinationDimensions?.length) return false;
    if (!this.scene) return false;
    if (this.background) {
      return this.background.Validate?.(destinationDimensions, [], realTime, simTime) !== false;
    }
    return true;
  }
  static {
    _initClass();
  }
}

export { _Tr2RenderNodeSprite as Tr2RenderNodeSprite2dScene };
//# sourceMappingURL=Tr2RenderNodeSprite2dScene.js.map
