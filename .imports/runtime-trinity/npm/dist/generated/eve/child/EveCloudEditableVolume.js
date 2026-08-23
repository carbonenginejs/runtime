import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_curveSets, _init_extra_curveSets, _init_animated, _init_extra_animated, _init_balls, _init_extra_balls, _init_bitmap, _init_extra_bitmap, _init_texture, _init_extra_texture, _init_depth, _init_extra_depth, _init_height, _init_extra_height, _init_width, _init_extra_width, _init_renderDebugInfo, _init_extra_renderDebugInfo;

/** EveCloudEditableVolume (eve/child) - generated from schema shapeHash 24151bad.... */
let _EveCloudEditableVolu;
class EveCloudEditableVolume extends CjsModel {
  static {
    ({
      e: [_init_curveSets, _init_extra_curveSets, _init_animated, _init_extra_animated, _init_balls, _init_extra_balls, _init_bitmap, _init_extra_bitmap, _init_texture, _init_extra_texture, _init_depth, _init_extra_depth, _init_height, _init_extra_height, _init_width, _init_extra_width, _init_renderDebugInfo, _init_extra_renderDebugInfo, _initProto],
      c: [_EveCloudEditableVolu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveCloudEditableVolume",
      family: "eve/child"
    })], [[[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "animated"], [[io, io.persist, void 0, type.list("EveCloudVolumeBall")], 16, "balls"], [[io, io.read, void 0, type.objectRef("Tr2HostBitmap")], 16, "bitmap"], [[io, io.read, void 0, type.objectRef("TriTextureRes")], 16, "texture"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "depth"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "height"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "width"], [[io, io.persist, type, type.boolean], 16, "renderDebugInfo"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Rasterize"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "OnVolumeModified"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_renderDebugInfo(this);
  }
  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  curveSets = (_initProto(this), _init_curveSets(this, []));

  /** m_animated (bool) [READWRITE, PERSIST, NOTIFY] */
  animated = (_init_extra_curveSets(this), _init_animated(this, false));

  /** m_balls (PEveCloudVolumeBallVector) [READ, PERSIST] */
  balls = (_init_extra_animated(this), _init_balls(this, []));

  /** m_bitmap (Tr2HostBitmapPtr) [READ] */
  bitmap = (_init_extra_balls(this), _init_bitmap(this, null));

  /** m_texture (TriTextureResPtr) [READ] */
  texture = (_init_extra_bitmap(this), _init_texture(this, null));

  /** m_depth (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  depth = (_init_extra_texture(this), _init_depth(this, 64));

  /** m_height (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  height = (_init_extra_depth(this), _init_height(this, 64));

  /** m_width (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  width = (_init_extra_height(this), _init_width(this, 64));

  /** m_renderDebugInfo (bool) [READWRITE, PERSIST] */
  renderDebugInfo = (_init_extra_width(this), _init_renderDebugInfo(this, false));

  /** Carbon method Rasterize (MAP_METHOD_AND_WRAP). */
  Rasterize(...args) {
    throw new Error("EveCloudEditableVolume.Rasterize is not implemented in CarbonEngineJS.");
  }

  /** Carbon method OnVolumeModified (MAP_METHOD_AND_WRAP). */
  OnVolumeModified(...args) {
    throw new Error("EveCloudEditableVolume.OnVolumeModified is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _EveCloudEditableVolu as EveCloudEditableVolume };
//# sourceMappingURL=EveCloudEditableVolume.js.map
