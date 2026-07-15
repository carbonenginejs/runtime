import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { vec3 } from '@carbonenginejs/core-math/vec3';
import { vec4 } from '@carbonenginejs/core-math/vec4';

let _initClass, _init_name, _init_extra_name, _init_vertexDeclarationHandle, _init_extra_vertexDeclarationHandle, _init_bytesPerVertex, _init_extra_bytesPerVertex, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_boundingSphere, _init_extra_boundingSphere, _init_jointBindings, _init_extra_jointBindings, _init_audioGeometry, _init_extra_audioGeometry, _init_decals, _init_extra_decals, _init_lodMask, _init_extra_lodMask, _init_lods, _init_extra_lods;

/** TriGeometryResMeshData (resources) - generated from schema shapeHash 3d7f49cc.... */
let _TriGeometryResMeshDa;
class TriGeometryResMeshData extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_vertexDeclarationHandle, _init_extra_vertexDeclarationHandle, _init_bytesPerVertex, _init_extra_bytesPerVertex, _init_minBounds, _init_extra_minBounds, _init_maxBounds, _init_extra_maxBounds, _init_boundingSphere, _init_extra_boundingSphere, _init_jointBindings, _init_extra_jointBindings, _init_audioGeometry, _init_extra_audioGeometry, _init_decals, _init_extra_decals, _init_lodMask, _init_extra_lodMask, _init_lods, _init_extra_lods],
      c: [_TriGeometryResMeshDa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriGeometryResMeshData",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [[type, type.uint32], 16, "vertexDeclarationHandle"], [[type, type.uint32], 16, "bytesPerVertex"], [[type, type.vec3], 16, "minBounds"], [[type, type.vec3], 16, "maxBounds"], [[type, type.vec4], 16, "boundingSphere"], [[type, type.unknown], 16, "jointBindings"], [type.rawStruct("AudioGeometryResData"), 0, "audioGeometry"], [type.list("MeshDecalData"), 0, "decals"], [[type, type.uint32], 16, "lodMask"], [type.rawStruct("TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>"), 0, "lods"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lods(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_vertexDeclarationHandle (unsigned int) */
  vertexDeclarationHandle = (_init_extra_name(this), _init_vertexDeclarationHandle(this, 0));

  /** m_bytesPerVertex (unsigned int) */
  bytesPerVertex = (_init_extra_vertexDeclarationHandle(this), _init_bytesPerVertex(this, -1));

  /** m_minBounds (Vector3) */
  minBounds = (_init_extra_bytesPerVertex(this), _init_minBounds(this, vec3.create()));

  /** m_maxBounds (Vector3) */
  maxBounds = (_init_extra_minBounds(this), _init_maxBounds(this, vec3.create()));

  /** m_boundingSphere (Vector4) */
  boundingSphere = (_init_extra_maxBounds(this), _init_boundingSphere(this, vec4.create()));

  /** m_jointBindings (TrackableStdVector<TriJointBinding>) */
  jointBindings = (_init_extra_boundingSphere(this), _init_jointBindings(this, null));

  /** m_audioGeometry (std::unique_ptr<AudioGeometryResData>) */
  audioGeometry = (_init_extra_jointBindings(this), _init_audioGeometry(this, null));

  /** m_decals (std::vector<std::shared_ptr<MeshDecalData>>) */
  decals = (_init_extra_audioGeometry(this), _init_decals(this, []));

  /** m_lodMask (uint32_t) */
  lodMask = (_init_extra_decals(this), _init_lodMask(this, 0));

  /** m_lods (TrackableStdVector<std::unique_ptr<TriGeometryResLodData>>) */
  lods = (_init_extra_lodMask(this), _init_lods(this, null));
  static {
    _initClass();
  }
}

export { _TriGeometryResMeshDa as TriGeometryResMeshData };
//# sourceMappingURL=TriGeometryResMeshData.js.map
