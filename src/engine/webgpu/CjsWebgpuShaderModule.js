import { cloneJson } from "./core/freeze.js";

/**
 * Immutable WebGPU-facing shader-module descriptor.
 */
export class CjsWebgpuShaderModule
{

  /**
   * @param {object} values Descriptor values.
   */
  constructor(values = {})
  {
    this.key = String(values.key || "");
    this.techniqueName = String(values.techniqueName || "");
    this.passIndex = Number.isInteger(values.passIndex) ? values.passIndex : 0;
    this.stageName = String(values.stageName || "");
    this.stageType = Number.isInteger(values.stageType) ? values.stageType : null;
    this.pipelineInputs = cloneJson(values.pipelineInputs || []);
    this.threadGroupSize = cloneJson(values.threadGroupSize || null);
    this.bindings = cloneJson(values.bindings || []);
    this.dxbc = cloneJson(values.dxbc || null);
    this.dxbcError = cloneJson(values.dxbcError || null);
    this.shaderBytecode = cloneJson(values.shaderBytecode || null);
    this.wgsl = typeof values.wgsl === "string" && values.wgsl ? values.wgsl : null;
    this.entryPoint = String(values.entryPoint || "main");
    this.sourceMap = cloneJson(values.sourceMap || []);
    this.shaderRecord = cloneJson(values.shaderRecord || null);
    Object.freeze(this);
  }

  /**
   * @returns {boolean} True when WGSL text is attached to this stage.
   */
  HasWgsl()
  {
    return typeof this.wgsl === "string" && this.wgsl.length > 0;
  }

  /**
   * @returns {object} Plain JSON-compatible descriptor.
   */
  ToJSON()
  {
    return cloneJson({
      key: this.key,
      techniqueName: this.techniqueName,
      passIndex: this.passIndex,
      stageName: this.stageName,
      stageType: this.stageType,
      pipelineInputs: this.pipelineInputs,
      threadGroupSize: this.threadGroupSize,
      bindings: this.bindings,
      dxbc: this.dxbc,
      dxbcError: this.dxbcError,
      shaderBytecode: this.shaderBytecode,
      wgsl: this.wgsl,
      entryPoint: this.entryPoint,
      sourceMap: this.sourceMap,
      shaderRecord: this.shaderRecord
    });
  }
}
