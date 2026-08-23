import { cloneJson, deepFreeze } from "./core/freeze.js";

/**
 * Immutable WebGPU-facing binding/resource descriptor.
 */
export class CjsWebgpuResource
{

  /**
   * @param {object} values Descriptor values.
   */
  constructor(values = {})
  {
    if (values.identity !== undefined && (typeof values.identity !== "string" || !values.identity))
    {
      throw new TypeError("CjsWebgpuResource identity must be a non-empty string when provided");
    }
    if (values.scopeIdentity !== undefined
      && (typeof values.scopeIdentity !== "string" || !values.scopeIdentity))
    {
      throw new TypeError("CjsWebgpuResource scopeIdentity must be a non-empty string when provided");
    }
    this.key = String(values.key || "");
    this.name = String(values.name || "");
    this.techniqueName = String(values.techniqueName || "");
    this.passIndex = Number.isInteger(values.passIndex) ? values.passIndex : 0;
    this.stageName = typeof values.stageName === "string" ? values.stageName : "";
    this.stageType = Number.isInteger(values.stageType) ? values.stageType : null;
    this.generatedSymbol = String(values.generatedSymbol || "");
    this.bindingKind = String(values.bindingKind || "resource");
    this.access = String(values.access || "readOnly");
    this.registerIndex = Number.isInteger(values.registerIndex) ? values.registerIndex : 0;
    this.registerSpace = Number.isInteger(values.registerSpace) ? values.registerSpace : null;
    this.registerCount = Number.isInteger(values.registerCount) ? values.registerCount : 1;
    this.arrayCount = Number.isInteger(values.arrayCount) ? values.arrayCount : 1;
    this.dynamic = Boolean(values.dynamic);
    this.heapView = Boolean(values.heapView);
    this.metadataName = values.metadataName ? String(values.metadataName) : null;
    this.carbon = deepFreeze(cloneJson(values.carbon || null));
    this.annotations = deepFreeze(cloneJson(values.annotations || []));
    this.sourceTruth = String(values.sourceTruth || "unknown");
    this.stages = deepFreeze(cloneJson(values.stages || []));
    this.resourceKind = String(values.resourceKind || "");
    this.identity = values.identity === undefined ? "" : values.identity;
    this.scopeIdentity = values.scopeIdentity === undefined ? this.identity : values.scopeIdentity;
    this.group = Number.isInteger(values.group) ? values.group : null;
    this.binding = Number.isInteger(values.binding) ? values.binding : null;
    this.visibility = deepFreeze(cloneJson(values.visibility || []));
    this.layout = deepFreeze(cloneJson(values.layout || null));
    this.structureStride = Number.isInteger(values.structureStride) ? values.structureStride : null;
    // Set only when the producer merged several source textures into this one
    // array binding. A consumer must then assemble the layers rather than bind a
    // single texture; null means the binding is fed directly.
    this.transformId = values.transformId ? String(values.transformId) : null;
    this.arrayLayerCount = Number.isInteger(values.arrayLayerCount) ? values.arrayLayerCount : null;
    if (new.target === CjsWebgpuResource)
    {
      Object.freeze(this);
    }
  }

  /**
   * @returns {object} Plain JSON-compatible descriptor.
   */
  ToJSON()
  {
    return cloneJson({
      key: this.key,
      name: this.name,
      techniqueName: this.techniqueName,
      passIndex: this.passIndex,
      stageName: this.stageName,
      stageType: this.stageType,
      generatedSymbol: this.generatedSymbol,
      bindingKind: this.bindingKind,
      access: this.access,
      registerIndex: this.registerIndex,
      registerSpace: this.registerSpace,
      registerCount: this.registerCount,
      arrayCount: this.arrayCount,
      dynamic: this.dynamic,
      heapView: this.heapView,
      metadataName: this.metadataName,
      carbon: this.carbon,
      annotations: this.annotations,
      sourceTruth: this.sourceTruth,
      stages: this.stages,
      resourceKind: this.resourceKind,
      ...(this.identity ? { identity: this.identity } : {}),
      ...(this.scopeIdentity ? { scopeIdentity: this.scopeIdentity } : {}),
      group: this.group,
      binding: this.binding,
      visibility: this.visibility,
      layout: this.layout,
      ...(this.structureStride !== null ? { structureStride: this.structureStride } : {}),
      ...(this.transformId !== null ? { transformId: this.transformId } : {}),
      ...(this.arrayLayerCount !== null ? { arrayLayerCount: this.arrayLayerCount } : {})
    });
  }
}
