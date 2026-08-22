import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2Effect as _Tr2Effect } from '../shader/Tr2Effect.js';
import { Tr2Denoiser as _Tr2Denoiser } from '../generated/trinityCore/Tr2Denoiser.js';
import { Tr2VariableStore as _Tr2VariableStore } from './variable/Tr2VariableStore.js';
import { TriFrustumOrtho } from './view/TriFrustumOrtho.js';

let _initProto, _initStatic, _initClass, _init_shadowSplitMode, _init_extra_shadowSplitMode, _init_denoiser, _init_extra_denoiser, _init_cascadeEffect, _init_extra_cascadeEffect, _init_splitCount, _init_extra_splitCount, _init_debugColorSplit, _init_extra_debugColorSplit, _init_SplitNr, _init_extra_SplitNr, _init_SplitNr2, _init_extra_SplitNr2, _init_SplitNr3, _init_extra_SplitNr3, _init_SplitNr4, _init_extra_SplitNr4, _init_SplitNr5, _init_extra_SplitNr5, _init_SplitNr6, _init_extra_SplitNr6, _init_SplitNr7, _init_extra_SplitNr7, _init_SplitNr8, _init_extra_SplitNr8, _init_SplitNr9, _init_extra_SplitNr9, _init_SplitNr0, _init_extra_SplitNr0, _init_SplitNr1, _init_extra_SplitNr1, _init_SplitNr10, _init_extra_SplitNr10, _init_SplitNr11, _init_extra_SplitNr11, _init_SplitNr12, _init_extra_SplitNr12, _init_SplitNr13, _init_extra_SplitNr13, _init_SplitNr14, _init_extra_SplitNr14, _init_disableShimmer, _init_extra_disableShimmer, _init_size, _init_extra_size;
const SHADOW_FRUSTUM_COUNT = 16;
const SHADOW_MAP_WIDTH = 8;
const SHADOW_MAP_HEIGHT = 2;
const STATIC_SPLITS = Object.freeze([25, 75, 150, 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 76800, 153600, 307200, 614400, 1228800]);
const DX_UNIT_CUBE = Object.freeze([Object.freeze([-1, -1, 0]), Object.freeze([-1, 1, 0]), Object.freeze([1, 1, 0]), Object.freeze([1, -1, 0]), Object.freeze([-1, -1, 1]), Object.freeze([-1, 1, 1]), Object.freeze([1, 1, 1]), Object.freeze([1, -1, 1])]);
const PROJECTION_SCRATCH = mat4.create();
const INVERSE_PROJECTION_SCRATCH = mat4.create();
const BASIS_SCRATCH = mat4.create();
const LIGHT_VIEW_SCRATCH = mat4.create();
const ORTHO_SCRATCH = mat4.create();
const TRANSFORMED_SCRATCH = vec4.create();
const WORLD_SCRATCH = vec3.create();
const LIGHT_DIRECTION_SCRATCH = vec3.create();
function createPerSplitData() {
  return {
    ShadowMapValues: Array.from({
      length: 4
    }, () => vec4.create()),
    ShadowMatrixVal: Array.from({
      length: SHADOW_FRUSTUM_COUNT
    }, () => mat4.create()),
    CascadeRanges: Array.from({
      length: SHADOW_FRUSTUM_COUNT
    }, () => vec4.create()),
    SplitInfo: vec4.create()
  };
}
function createSplitSetup() {
  return {
    shadowFrustum: new TriFrustumOrtho(),
    lightViewProjection: mat4.create(),
    invViewProj: mat4.create(),
    aabb: {
      min: vec3.create(),
      max: vec3.create()
    },
    corners: Array.from({
      length: 8
    }, () => vec3.create())
  };
}
function createShadowEffect() {
  const effect = new _Tr2Effect();
  effect.SetEffectPathName("res:/graphics/effect/managed/space/system/ShadowDepth.fx");
  effect.AddResourceTexture2D("EveSpaceSceneCascadedShadowMap");
  effect.AddResourceTexture2D("DepthMap");
  return effect;
}

/** Carbon PerspectiveOffCenterMatrix: D3D zero-to-one depth. */
function writePerspectiveOffCenter(out, left, right, bottom, top, near, far) {
  out.fill(0);
  out[0] = 2 * near / (right - left);
  out[5] = -2 * near / (bottom - top);
  out[8] = 1 + 2 * left / (right - left);
  out[9] = -1 - 2 * top / (bottom - top);
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = near * far / (near - far);
  return out;
}

/** Carbon OrthoNormalBasisZ. Flat matrix bytes match gl-matrix storage. */
function writeOrthoNormalBasisZ(out, z) {
  mat4.identity(out);
  const length = Math.hypot(z[0], z[1], z[2]);
  const zx = z[0] / length;
  const zy = z[1] / length;
  const zz = z[2] / length;
  out[8] = zx;
  out[9] = zy;
  out[10] = zz;
  const xx = Math.abs(zx) > 0.99 ? 0 : 1;
  const xy = Math.abs(zx) > 0.99 ? 1 : 0;
  let yx = xy * zz;
  let yy = -xx * zz;
  let yz = xx * zy - xy * zx;
  const yLength = Math.hypot(yx, yy, yz);
  yx /= yLength;
  yy /= yLength;
  yz /= yLength;
  out[4] = yx;
  out[5] = yy;
  out[6] = yz;
  out[0] = yy * zz - yz * zy;
  out[1] = yz * zx - yx * zz;
  out[2] = yx * zy - yy * zx;
  return out;
}

/** Carbon OrthoOffCenterMatrix: D3D zero-to-one depth. */
function writeOrthoOffCenter(out, left, right, bottom, top, near, far) {
  mat4.identity(out);
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = 1 / (near - far);
  out[12] = -1 - 2 * left / (right - left);
  out[13] = 1 + 2 * top / (bottom - top);
  out[14] = near / (near - far);
  return out;
}

/** Cascaded-shadow split producer; engines realize only its GPU operations. */
let _Tr2ShadowMap;
new class extends _identity {
  static [class Tr2ShadowMap extends CjsModel {
    static {
      ({
        e: [_init_shadowSplitMode, _init_extra_shadowSplitMode, _init_denoiser, _init_extra_denoiser, _init_cascadeEffect, _init_extra_cascadeEffect, _init_splitCount, _init_extra_splitCount, _init_debugColorSplit, _init_extra_debugColorSplit, _init_SplitNr, _init_extra_SplitNr, _init_SplitNr2, _init_extra_SplitNr2, _init_SplitNr3, _init_extra_SplitNr3, _init_SplitNr4, _init_extra_SplitNr4, _init_SplitNr5, _init_extra_SplitNr5, _init_SplitNr6, _init_extra_SplitNr6, _init_SplitNr7, _init_extra_SplitNr7, _init_SplitNr8, _init_extra_SplitNr8, _init_SplitNr9, _init_extra_SplitNr9, _init_SplitNr0, _init_extra_SplitNr0, _init_SplitNr1, _init_extra_SplitNr1, _init_SplitNr10, _init_extra_SplitNr10, _init_SplitNr11, _init_extra_SplitNr11, _init_SplitNr12, _init_extra_SplitNr12, _init_SplitNr13, _init_extra_SplitNr13, _init_SplitNr14, _init_extra_SplitNr14, _init_disableShimmer, _init_extra_disableShimmer, _init_size, _init_extra_size, _initProto, _initStatic],
        c: [_Tr2ShadowMap, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ShadowMap",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("ShadowSplitMode")], 16, "shadowSplitMode"], [[io, io.readwrite, void 0, type.objectRef("Tr2Denoiser")], 16, "denoiser"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "cascadeEffect"], [[io, io.notify, io, io.read, type, type.uint32], 16, "splitCount"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "debugColorSplit"], [[io, io.readwrite, type, type.float32], 16, "SplitNr15"], [[io, io.readwrite, type, type.float32], 16, "SplitNr8"], [[io, io.readwrite, type, type.float32], 16, "SplitNr6"], [[io, io.readwrite, type, type.float32], 16, "SplitNr5"], [[io, io.readwrite, type, type.float32], 16, "SplitNr14"], [[io, io.readwrite, type, type.float32], 16, "SplitNr10"], [[io, io.readwrite, type, type.float32], 16, "SplitNr13"], [[io, io.readwrite, type, type.float32], 16, "SplitNr4"], [[io, io.readwrite, type, type.float32], 16, "SplitNr3"], [[io, io.readwrite, type, type.float32], 16, "SplitNr7"], [[io, io.readwrite, type, type.float32], 16, "SplitNr1"], [[io, io.readwrite, type, type.float32], 16, "SplitNr9"], [[io, io.readwrite, type, type.float32], 16, "SplitNr0"], [[io, io.readwrite, type, type.float32], 16, "SplitNr11"], [[io, io.readwrite, type, type.float32], 16, "SplitNr12"], [[io, io.readwrite, type, type.float32], 16, "SplitNr2"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "disableShimmer"], [[io, io.readwrite, type, type.uint32], 16, "size"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The fixed PerSplitData arrays make split counts above Carbon's 16-slot capacity fail immediately instead of corrupting adjacent native memory.")], 18, "Setup"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CjsModel notifications expose settled state rather than Be::Var identity, so this compares the two notify-backed values against their cached state.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "ShouldUseDenoiser"], [[impl, impl.custom, void 0, impl.reason("The nominal engine executor needs Carbon's private denoiser-use decision without reading implementation fields.")], 18, "GetUseDenoiser"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSplitValues"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The caller supplies owned JS output containers; matrix bytes stay in logical gl-matrix form and are never pre-transposed.")], 26, "CalculateAABB"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon stores Transpose(lightViewProjection) and returns SplitSetup by value; Trinity stores the logical matrix for RawData's terminal transpose and reuses one allocation-free result per split.")], 18, "SetupShadowSplit"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU pool allocation is realized by the nominal shadow executor installed on the render context.")], 18, "PrepareShadowRendering"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Viewport and physical depth-target state are engine realization details.")], 18, "BeginShadowRendering"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Physical render-state restoration is owned by the engine executor.")], 18, "EndShadowRendering"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The engine owns temporary targets, fullscreen drawing and physical denoising.")], 18, "DrawToShadowMapResult"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowSplitCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowMapSize"], [[impl, impl.custom, void 0, impl.reason("The nominal engine executor needs Carbon's private fixed atlas width without reading implementation fields.")], 18, "GetShadowMapWidth"], [[impl, impl.custom, void 0, impl.reason("The nominal engine executor needs Carbon's private fixed atlas height without reading implementation fields.")], 18, "GetShadowMapHeight"], [[impl, impl.custom, void 0, impl.reason("The scene needs a nominal direct accessor to Carbon's public PerSplitData without structural probing.")], 18, "GetPerSplitData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDebugSplitValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDebugColors"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    shadowSplitMode = (_initProto(this), _init_shadowSplitMode(this, 0));
    denoiser = (_init_extra_shadowSplitMode(this), _init_denoiser(this, new _Tr2Denoiser()));
    cascadeEffect = (_init_extra_denoiser(this), _init_cascadeEffect(this, createShadowEffect()));
    splitCount = (_init_extra_cascadeEffect(this), _init_splitCount(this, SHADOW_FRUSTUM_COUNT));
    debugColorSplit = (_init_extra_splitCount(this), _init_debugColorSplit(this, false));
    SplitNr15 = (_init_extra_debugColorSplit(this), _init_SplitNr(this, STATIC_SPLITS[15]));
    SplitNr8 = (_init_extra_SplitNr(this), _init_SplitNr2(this, STATIC_SPLITS[8]));
    SplitNr6 = (_init_extra_SplitNr2(this), _init_SplitNr3(this, STATIC_SPLITS[6]));
    SplitNr5 = (_init_extra_SplitNr3(this), _init_SplitNr4(this, STATIC_SPLITS[5]));
    SplitNr14 = (_init_extra_SplitNr4(this), _init_SplitNr5(this, STATIC_SPLITS[14]));
    SplitNr10 = (_init_extra_SplitNr5(this), _init_SplitNr6(this, STATIC_SPLITS[10]));
    SplitNr13 = (_init_extra_SplitNr6(this), _init_SplitNr7(this, STATIC_SPLITS[13]));
    SplitNr4 = (_init_extra_SplitNr7(this), _init_SplitNr8(this, STATIC_SPLITS[4]));
    SplitNr3 = (_init_extra_SplitNr8(this), _init_SplitNr9(this, STATIC_SPLITS[3]));
    SplitNr7 = (_init_extra_SplitNr9(this), _init_SplitNr0(this, STATIC_SPLITS[7]));
    SplitNr1 = (_init_extra_SplitNr0(this), _init_SplitNr1(this, STATIC_SPLITS[1]));
    SplitNr9 = (_init_extra_SplitNr1(this), _init_SplitNr10(this, STATIC_SPLITS[9]));
    SplitNr0 = (_init_extra_SplitNr10(this), _init_SplitNr11(this, STATIC_SPLITS[0]));
    SplitNr11 = (_init_extra_SplitNr11(this), _init_SplitNr12(this, STATIC_SPLITS[11]));
    SplitNr12 = (_init_extra_SplitNr12(this), _init_SplitNr13(this, STATIC_SPLITS[12]));
    SplitNr2 = (_init_extra_SplitNr13(this), _init_SplitNr14(this, STATIC_SPLITS[2]));
    disableShimmer = (_init_extra_SplitNr14(this), _init_disableShimmer(this, true));
    size = (_init_extra_disableShimmer(this), _init_size(this, 2048));
    perSplitData = (_init_extra_size(this), createPerSplitData());
    #width = SHADOW_MAP_WIDTH;
    #height = SHADOW_MAP_HEIGHT;
    #oldZFar = 0;
    #useDenoiser = true;
    #lastNearClip = 0;
    #lastFarClip = 0;
    #lastShadowSplitMode = _Tr2ShadowMap.ShadowSplitMode.STATIC;
    #lastDebugColorSplit = false;
    #splitSetups = Array.from({
      length: SHADOW_FRUSTUM_COUNT
    }, () => createSplitSetup());

    /** Creates the logical effect/denoiser state and reserves Carbon's globals. */
    constructor() {
      super();
      const store = _Tr2VariableStore.GlobalStore();
      store.RegisterVariable("EveSpaceSceneShadowMap");
      store.RegisterVariable("EveSpaceSceneCascadedShadowMap");
    }

    /** Applies the atlas element size/count and the one-way denoiser disable. */
    Setup(elementSize, elementCount, useDenoiser) {
      const nextSize = elementSize >>> 0;
      const nextCount = elementCount >>> 0;
      if (nextCount > SHADOW_FRUSTUM_COUNT) {
        throw new RangeError(`Tr2ShadowMap supports at most ${SHADOW_FRUSTUM_COUNT} splits.`);
      }
      if (this.size !== nextSize || this.splitCount !== nextCount) {
        this.size = nextSize;
        this.splitCount = nextCount;
        this.perSplitData.SplitInfo[0] = nextCount;
      }
      this.#useDenoiser = Boolean(useDenoiser);
      if (!this.#useDenoiser) {
        this.denoiser = null;
      }
    }

    /** Applies Carbon's notification consequences from the current owned state. */
    OnModified() {
      if (this.debugColorSplit !== this.#lastDebugColorSplit) {
        this.cascadeEffect.SetOption("SHADOW_DEBUG_MODE", this.debugColorSplit ? "SDM_COLOR" : "SDM_NONE");
        this.#lastDebugColorSplit = this.debugColorSplit;
      }
      if (this.shadowSplitMode !== this.#lastShadowSplitMode) {
        if (this.shadowSplitMode === _Tr2ShadowMap.ShadowSplitMode.STATIC) {
          this.#SetStaticShadowSplits();
        } else if (this.shadowSplitMode === _Tr2ShadowMap.ShadowSplitMode.DYNAMIC) {
          this.#lastNearClip = 0;
          this.#lastFarClip = 0;
        }
        this.#lastShadowSplitMode = this.shadowSplitMode;
      }
      this.perSplitData.SplitInfo[0] = this.splitCount;
      return true;
    }
    /** Changes whether an existing denoiser should be used for future results. */
    ShouldUseDenoiser(value) {
      this.#useDenoiser = Boolean(value);
    }

    /** Engine-facing read of Carbon's private denoiser-use switch. */
    GetUseDenoiser() {
      return this.#useDenoiser;
    }

    /** Recomputes geometric dynamic split endpoints when the clip range changes. */
    UpdateSplitValues(nearClip, farClip) {
      if (this.shadowSplitMode !== _Tr2ShadowMap.ShadowSplitMode.DYNAMIC) return;
      if (this.#lastNearClip === nearClip && this.#lastFarClip === farClip) return;
      this.#lastNearClip = nearClip;
      this.#lastFarClip = farClip;
      const logNear = Math.log2(nearClip);
      const logFar = Math.log2(farClip);
      for (let index = 0; index < this.splitCount; index++) {
        this.#SetSplitValue(index, Math.pow(2, logNear + (logFar - logNear) * ((index + 1) / this.splitCount)));
      }
    }

    /**
     * Transforms the D3D clip cube through projection inverse, inverse view and
     * light view, returning its light-space bounds and writing all eight corners.
     */
    static CalculateAABB(projection, invViewTransform, lightView, corners, out = {
      min: vec3.create(),
      max: vec3.create()
    }) {
      mat4.invert(INVERSE_PROJECTION_SCRATCH, projection);
      const min = out.min;
      const max = out.max;
      min[0] = min[1] = min[2] = Infinity;
      max[0] = max[1] = max[2] = -Infinity;
      for (let index = 0; index < DX_UNIT_CUBE.length; index++) {
        const source = DX_UNIT_CUBE[index];
        TRANSFORMED_SCRATCH[0] = source[0];
        TRANSFORMED_SCRATCH[1] = source[1];
        TRANSFORMED_SCRATCH[2] = source[2];
        TRANSFORMED_SCRATCH[3] = 1;
        vec4.transformMat4(TRANSFORMED_SCRATCH, TRANSFORMED_SCRATCH, INVERSE_PROJECTION_SCRATCH);
        const inverseW = 1 / TRANSFORMED_SCRATCH[3];
        WORLD_SCRATCH[0] = TRANSFORMED_SCRATCH[0] * inverseW;
        WORLD_SCRATCH[1] = TRANSFORMED_SCRATCH[1] * inverseW;
        WORLD_SCRATCH[2] = TRANSFORMED_SCRATCH[2] * inverseW;
        vec3.transformMat4(WORLD_SCRATCH, WORLD_SCRATCH, invViewTransform);
        vec3.transformMat4(corners[index], WORLD_SCRATCH, lightView);
        const corner = corners[index];
        min[0] = Math.min(min[0], corner[0]);
        min[1] = Math.min(min[1], corner[1]);
        min[2] = Math.min(min[2], corner[2]);
        max[0] = Math.max(max[0], corner[0]);
        max[1] = Math.max(max[1], corner[1]);
        max[2] = Math.max(max[2], corner[2]);
      }
      return out;
    }

    /**
     * Builds one logical light-view-projection split and its shader data.
     *
     * The returned object is an allocation-free borrowed view for this split and
     * is overwritten the next time the same split index is prepared.
     */
    SetupShadowSplit(splitIndex, invViewTransform, lightDirection, zNear, leftDivNear, rightDivNear, topDivNear, bottomDivNear) {
      if (!Number.isInteger(splitIndex) || splitIndex < 0 || splitIndex >= this.splitCount) {
        throw new RangeError("Tr2ShadowMap.SetupShadowSplit received an invalid split index.");
      }
      const setup = this.#splitSetups[splitIndex];
      if (splitIndex === 0) this.#oldZFar = zNear;
      const zFar = this.#GetSplitValue(splitIndex);
      this.perSplitData.ShadowMapValues[splitIndex >> 2][splitIndex & 3] = zFar;
      const left = leftDivNear * this.#oldZFar;
      const right = rightDivNear * this.#oldZFar;
      const top = topDivNear * this.#oldZFar;
      const bottom = bottomDivNear * this.#oldZFar;
      writePerspectiveOffCenter(PROJECTION_SCRATCH, left, right, bottom, top, this.#oldZFar, zFar);
      this.#oldZFar = zFar;
      mat4.invert(INVERSE_PROJECTION_SCRATCH, PROJECTION_SCRATCH);
      // Carbon inverseProjection * inverseView; gl-matrix reverses the operands.
      mat4.multiply(setup.invViewProj, invViewTransform, INVERSE_PROJECTION_SCRATCH);
      LIGHT_DIRECTION_SCRATCH[0] = -lightDirection[0];
      LIGHT_DIRECTION_SCRATCH[1] = -lightDirection[1];
      LIGHT_DIRECTION_SCRATCH[2] = -lightDirection[2];
      writeOrthoNormalBasisZ(BASIS_SCRATCH, LIGHT_DIRECTION_SCRATCH);
      mat4.invert(LIGHT_VIEW_SCRATCH, BASIS_SCRATCH);
      _Tr2ShadowMap.CalculateAABB(PROJECTION_SCRATCH, invViewTransform, LIGHT_VIEW_SCRATCH, setup.corners, setup.aabb);
      const min = setup.aabb.min;
      const max = setup.aabb.max;
      if (this.disableShimmer) {
        let maxDistance = 0;
        for (let first = 0; first < setup.corners.length; first++) {
          for (let second = first + 1; second < setup.corners.length; second++) {
            const a = setup.corners[first];
            const b = setup.corners[second];
            maxDistance = Math.max(maxDistance, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
          }
        }
        const radius = Math.ceil(maxDistance / 2);
        const texelSize = radius * 2 / this.size;
        const centerX = Math.floor((min[0] + max[0]) * 0.5 / texelSize + 0.5) * texelSize;
        const centerY = Math.floor((min[1] + max[1]) * 0.5 / texelSize + 0.5) * texelSize;
        const centerZ = (min[2] + max[2]) * 0.5;
        min[0] = centerX - radius;
        min[1] = centerY - radius;
        min[2] = centerZ - radius;
        max[0] = centerX + radius;
        max[1] = centerY + radius;
        max[2] = centerZ + radius;
      }
      writeOrthoOffCenter(ORTHO_SCRATCH, max[0], min[0], max[1], min[1], -max[2], -min[2]);
      // Carbon lightView * ortho; gl-matrix reverses the operands.
      mat4.multiply(setup.lightViewProjection, ORTHO_SCRATCH, LIGHT_VIEW_SCRATCH);
      const range = this.perSplitData.CascadeRanges[splitIndex];
      range[0] = max[0] - min[0];
      range[1] = max[1] - min[1];
      range[2] = max[2] - min[2];
      range[3] = 0;
      mat4.copy(this.perSplitData.ShadowMatrixVal[splitIndex], setup.lightViewProjection);
      setup.shadowFrustum.DeriveFrustum(LIGHT_VIEW_SCRATCH, min, max);
      return setup;
    }

    /** Delegates physical atlas allocation and setup to the installed engine. */
    PrepareShadowRendering(renderContext) {
      return renderContext.GetShadowMapExecutor().PrepareShadowRendering(this, renderContext);
    }

    /** Delegates one atlas-cell render-pass begin to the installed engine. */
    BeginShadowRendering(renderContext, splitIndex) {
      return renderContext.GetShadowMapExecutor().BeginShadowRendering(this, splitIndex, renderContext);
    }

    /** Delegates shadow rendering teardown to the installed engine. */
    EndShadowRendering(renderContext) {
      return renderContext.GetShadowMapExecutor().EndShadowRendering(this, renderContext);
    }

    /** Delegates shadow-result realization and optional denoising to the engine. */
    DrawToShadowMapResult(renderContext, depthMap, cascadedShadowDepth, upscaling) {
      return renderContext.GetShadowMapExecutor().DrawToShadowMapResult(this, depthMap, cascadedShadowDepth, upscaling, renderContext);
    }
    /** Returns the number of active cascade splits. */
    GetShadowSplitCount() {
      return this.splitCount;
    }
    /** Returns the square pixel size of one atlas cell. */
    GetShadowMapSize() {
      return this.size;
    }

    /** Returns the fixed number of atlas columns. */
    GetShadowMapWidth() {
      return this.#width;
    }

    /** Returns the fixed number of atlas rows. */
    GetShadowMapHeight() {
      return this.#height;
    }

    /** Returns the stable owned record consumed by scene per-frame packing. */
    GetPerSplitData() {
      return this.perSplitData;
    }
    /** Returns the logical effect used to resolve the screen-space shadow mask. */
    GetShadowEffect() {
      return this.cascadeEffect;
    }
    /** Reports whether cascade-debug colouring is enabled. */
    GetDebugSplitValue() {
      return this.debugColorSplit;
    }
    /** Returns Carbon's packed debug colour for a cascade colour index. */
    GetDebugColors(switchCase) {
      switch (switchCase) {
        case 0:
          return 0xffffffff;
        case 1:
          return 0xffff0000;
        case 2:
          return 0xff00ff00;
        case 3:
          return 0xff0000ff;
        case 4:
          return 0xffffff00;
        case 5:
          return 0xff00ffff;
        case 6:
          return 0x2200ffff;
        case 7:
          return 0xff555555;
        case 8:
          return 0xff888888;
        default:
          return undefined;
      }
    }

    /** Restores the sixteen fixed Carbon cascade endpoints. */
    #SetStaticShadowSplits() {
      for (let index = 0; index < STATIC_SPLITS.length; index++) {
        this.#SetSplitValue(index, STATIC_SPLITS[index]);
      }
    }

    /** Writes one authored/dynamic split endpoint to its public field. */
    #SetSplitValue(index, value) {
      this[`SplitNr${index}`] = value;
    }

    /** Reads one split endpoint from its public field. */
    #GetSplitValue(index) {
      return this[`SplitNr${index}`];
    }
  }];
  ShadowSplitMode = Object.freeze({
    STATIC: 0,
    DYNAMIC: 1,
    MANUAL: 2
  });
  constructor() {
    super(_Tr2ShadowMap), _initClass();
  }
}();

export { _Tr2ShadowMap as Tr2ShadowMap };
//# sourceMappingURL=Tr2ShadowMap.js.map
