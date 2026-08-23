import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_sourceFormat, _init_extra_sourceFormat, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_offsetXRaw, _init_extra_offsetXRaw, _init_offsetYRaw, _init_extra_offsetYRaw, _init_offsetUnit, _init_extra_offsetUnit, _init_physicalPixelDimensionsXRaw, _init_extra_physicalPixelDimensionsXRaw, _init_physicalPixelDimensionsYRaw, _init_extra_physicalPixelDimensionsYRaw, _init_physicalPixelDimensionsUnit, _init_extra_physicalPixelDimensionsUnit, _init_offsetX, _init_extra_offsetX, _init_offsetY, _init_extra_offsetY, _init_extentX, _init_extra_extentX, _init_extentY, _init_extra_extentY, _init_hasOffsetMetadata, _init_extra_hasOffsetMetadata, _init_hasPhysicalPixelDimensionsMetadata, _init_extra_hasPhysicalPixelDimensionsMetadata, _init_hasPlacementMetadata, _init_extra_hasPlacementMetadata, _init_placementEncoding, _init_extra_placementEncoding, _init_placementPolicy, _init_extra_placementPolicy, _init_placementStatus, _init_extra_placementStatus;

/** Inspected source-image facts and normalized character-atlas placement. */
let _CjsCharacterTextureM;
class CjsCharacterTextureMetadata extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_sourceFormat, _init_extra_sourceFormat, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_offsetXRaw, _init_extra_offsetXRaw, _init_offsetYRaw, _init_extra_offsetYRaw, _init_offsetUnit, _init_extra_offsetUnit, _init_physicalPixelDimensionsXRaw, _init_extra_physicalPixelDimensionsXRaw, _init_physicalPixelDimensionsYRaw, _init_extra_physicalPixelDimensionsYRaw, _init_physicalPixelDimensionsUnit, _init_extra_physicalPixelDimensionsUnit, _init_offsetX, _init_extra_offsetX, _init_offsetY, _init_extra_offsetY, _init_extentX, _init_extra_extentX, _init_extentY, _init_extra_extentY, _init_hasOffsetMetadata, _init_extra_hasOffsetMetadata, _init_hasPhysicalPixelDimensionsMetadata, _init_extra_hasPhysicalPixelDimensionsMetadata, _init_hasPlacementMetadata, _init_extra_hasPlacementMetadata, _init_placementEncoding, _init_extra_placementEncoding, _init_placementPolicy, _init_extra_placementPolicy, _init_placementStatus, _init_extra_placementStatus],
      c: [_CjsCharacterTextureM, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterTextureMetadata",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "sourcePath"], [[io, io.readwrite, type, type.string], 16, "sourceFormat"], [[io, io.readwrite, type, type.uint32], 16, "width"], [[io, io.readwrite, type, type.uint32], 16, "height"], [[io, io.readwrite, type, type.int32], 16, "offsetXRaw"], [[io, io.readwrite, type, type.int32], 16, "offsetYRaw"], [[io, io.readwrite, type, type.uint32], 16, "offsetUnit"], [[io, io.readwrite, type, type.uint32], 16, "physicalPixelDimensionsXRaw"], [[io, io.readwrite, type, type.uint32], 16, "physicalPixelDimensionsYRaw"], [[io, io.readwrite, type, type.uint32], 16, "physicalPixelDimensionsUnit"], [[io, io.readwrite, type, type.float64], 16, "offsetX"], [[io, io.readwrite, type, type.float64], 16, "offsetY"], [[io, io.readwrite, type, type.float64], 16, "extentX"], [[io, io.readwrite, type, type.float64], 16, "extentY"], [[io, io.readwrite, type, type.boolean], 16, "hasOffsetMetadata"], [[io, io.readwrite, type, type.boolean], 16, "hasPhysicalPixelDimensionsMetadata"], [[io, io.readwrite, type, type.boolean], 16, "hasPlacementMetadata"], [[io, io.readwrite, type, type.string], 16, "placementEncoding"], [[io, io.readwrite, type, type.string], 16, "placementPolicy"], [[io, io.readwrite, type, type.string], 16, "placementStatus"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_placementStatus(this);
  }
  sourcePath = _init_sourcePath(this, null);
  sourceFormat = (_init_extra_sourcePath(this), _init_sourceFormat(this, "png"));
  width = (_init_extra_sourceFormat(this), _init_width(this, 0));
  height = (_init_extra_width(this), _init_height(this, 0));
  offsetXRaw = (_init_extra_height(this), _init_offsetXRaw(this, null));
  offsetYRaw = (_init_extra_offsetXRaw(this), _init_offsetYRaw(this, null));
  offsetUnit = (_init_extra_offsetYRaw(this), _init_offsetUnit(this, null));
  physicalPixelDimensionsXRaw = (_init_extra_offsetUnit(this), _init_physicalPixelDimensionsXRaw(this, null));
  physicalPixelDimensionsYRaw = (_init_extra_physicalPixelDimensionsXRaw(this), _init_physicalPixelDimensionsYRaw(this, null));
  physicalPixelDimensionsUnit = (_init_extra_physicalPixelDimensionsYRaw(this), _init_physicalPixelDimensionsUnit(this, null));
  offsetX = (_init_extra_physicalPixelDimensionsUnit(this), _init_offsetX(this, 0));
  offsetY = (_init_extra_offsetX(this), _init_offsetY(this, 0));
  extentX = (_init_extra_offsetY(this), _init_extentX(this, 1));
  extentY = (_init_extra_extentX(this), _init_extentY(this, 1));
  hasOffsetMetadata = (_init_extra_extentY(this), _init_hasOffsetMetadata(this, false));
  hasPhysicalPixelDimensionsMetadata = (_init_extra_hasOffsetMetadata(this), _init_hasPhysicalPixelDimensionsMetadata(this, false));
  hasPlacementMetadata = (_init_extra_hasPhysicalPixelDimensionsMetadata(this), _init_hasPlacementMetadata(this, false));
  placementEncoding = (_init_extra_hasPlacementMetadata(this), _init_placementEncoding(this, null));
  placementPolicy = (_init_extra_placementEncoding(this), _init_placementPolicy(this, null));
  placementStatus = (_init_extra_placementPolicy(this), _init_placementStatus(this, null));

  /** Converts generic CjsPngFormat inspection facts into character placement. */
  static fromPngInspection(recordID, sourcePath, metadata) {
    if (!metadata || metadata.sourceFormat !== "png") {
      throw new TypeError("Character texture metadata requires PNG inspection values");
    }
    if (!Object.hasOwn(metadata, "offset") || !Object.hasOwn(metadata, "physicalPixelDimensions")) {
      throw new TypeError("Character texture metadata requires PNG placement chunk inspection");
    }
    const rawOffset = metadata.offset ?? null;
    const rawPhysical = metadata.physicalPixelDimensions ?? null;
    const offset = rawOffset?.unit === 0 ? rawOffset : null;
    const extent = rawPhysical?.unit === 0 ? rawPhysical : null;
    const hasPlacementMetadata = Number(extent?.x) > 0 && Number(extent?.y) > 0;
    return {
      recordID: RequireResourceIdentity(recordID),
      sourcePath: RequirePngResourcePath(sourcePath),
      sourceFormat: "png",
      width: RequireDimension(metadata.width, "width"),
      height: RequireDimension(metadata.height, "height"),
      offsetXRaw: rawOffset === null ? null : Number(rawOffset.x),
      offsetYRaw: rawOffset === null ? null : Number(rawOffset.y),
      offsetUnit: rawOffset === null ? null : Number(rawOffset.unit),
      physicalPixelDimensionsXRaw: rawPhysical === null ? null : Number(rawPhysical.x),
      physicalPixelDimensionsYRaw: rawPhysical === null ? null : Number(rawPhysical.y),
      physicalPixelDimensionsUnit: rawPhysical === null ? null : Number(rawPhysical.unit),
      offsetX: offset ? Number(offset.x) / 1e6 : 0,
      offsetY: offset ? Number(offset.y) / 1e6 : 0,
      extentX: hasPlacementMetadata ? Number(extent.x) / 1e6 : 1,
      extentY: hasPlacementMetadata ? Number(extent.y) / 1e6 : 1,
      hasOffsetMetadata: rawOffset !== null,
      hasPhysicalPixelDimensionsMetadata: rawPhysical !== null,
      hasPlacementMetadata,
      placementEncoding: hasPlacementMetadata ? "png-oFFs-pHYs-millionths" : null,
      placementPolicy: hasPlacementMetadata ? "ccp-character-atlas-millionths-v1" : null,
      placementStatus: hasPlacementMetadata ? "experimental-policy" : null
    };
  }
  static {
    _initClass();
  }
}
function RequireResourceIdentity(value) {
  const path = String(value ?? "").trim();
  if (!/^res:\/[^?#]+$/iu.test(path) || /\.[^/]+$/u.test(path)) {
    throw new TypeError("Character texture metadata recordID must be an extension-neutral res:/ path");
  }
  return path;
}
function RequirePngResourcePath(value) {
  const path = String(value ?? "").trim();
  if (!/^res:\/[^?#]+\.png$/iu.test(path)) {
    throw new TypeError("Character texture metadata sourcePath must be a res:/ PNG path");
  }
  return path;
}
function RequireDimension(value, name) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new TypeError(`Character texture metadata ${name} must be a positive integer`);
  }
  return result;
}

export { _CjsCharacterTextureM as CjsCharacterTextureMetadata };
//# sourceMappingURL=CjsCharacterTextureMetadata.js.map
