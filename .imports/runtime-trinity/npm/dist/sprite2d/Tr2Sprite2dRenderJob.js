import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { carbon, impl, io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObjectPickState } from '../generated/sprite2d/enums.js';
import { Tr2SpriteObjectBase as _Tr2SpriteObjectBase } from './Tr2SpriteObjectBase.js';

let _initProto, _initClass, _init_renderJob, _init_extra_renderJob;

/** A Sprite2D leaf that executes an authored render job. */
let _Tr2Sprite2dRenderJob;
class Tr2Sprite2dRenderJob extends _Tr2SpriteObjectBase {
  static {
    ({
      e: [_init_renderJob, _init_extra_renderJob, _initProto],
      c: [_Tr2Sprite2dRenderJob, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dRenderJob",
      family: "sprite2d"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "GatherSprites"], [[carbon, carbon.method, impl, impl.implemented], 18, "PickPoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVertexCount"], [[io, io.readwrite, void 0, type.objectRef("TriRenderJob")], 16, "renderJob"]], 0, void 0, _Tr2SpriteObjectBase));
  }
  /** Carbon method GatherSprites. */
  GatherSprites(renderer) {
    if (this.renderJob && this.display) {
      renderer.RunJob(this.renderJob);
    }
  }

  /** Carbon method PickPoint. */
  PickPoint(x, y, renderer) {
    if (!this.display || this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON) {
      return null;
    }
    vec2.set(this.#point, x, y);
    vec2.set(this.#translation, this.displayX, this.displayY);
    if (!renderer.IsInside(this.#point, this.#translation, this.displayWidth, this.displayHeight, 0)) {
      return null;
    }
    if (this.pickingMask && !this.pickingMask.SampleMask(renderer.InverseTransformPoint(this.#point), this.#translation, this.displayWidth, this.displayHeight)) {
      return null;
    }
    return this;
  }

  /** Carbon method GetVertexCount. */
  GetVertexCount() {
    return 0;
  }

  /** m_renderJob (TriRenderJobPtr) [READWRITE] */
  renderJob = (_initProto(this), _init_renderJob(this, null));
  #point = (_init_extra_renderJob(this), vec2.create());
  #translation = vec2.create();
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dRenderJob as Tr2Sprite2dRenderJob };
//# sourceMappingURL=Tr2Sprite2dRenderJob.js.map
