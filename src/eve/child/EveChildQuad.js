// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildQuad.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";

/** A billboard quad child that renders through the shared quad renderer's additive instance batch rather than the normal render-batch path. */
@type.define({ className: "EveChildQuad", family: "eve/child" })
export class EveChildQuad extends EveChildTransform
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScreenSize = 0;

  /** m_brightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightness = 1;

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_viewRotation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  viewRotation = 0;

  /** m_currentScreenSize (mutable float) [READ] */
  @io.read
  @type.float32
  currentScreenSize = -1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_editMode (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  editMode = false;

  /** m_effectKey (unsigned) - cached Tr2Effect hash used as the quad-renderer bucket key. */
  #effectKey = 0;

  /** m_isVisible (bool) - result of the last UpdateVisibility pass. */
  #isVisible = false;

  /** m_hasUpdated (bool) - until an update ran, the quad cannot be rendered. */
  #hasUpdated = false;

  // m_quad (EveChildQuad::Quad, EveChildQuad.h:55-67) - the per-instance
  // record handed to the quad renderer. Carbon stores the color/brightness
  // fields as Float_16; the half packing happens at buffer-build time in the
  // engine, so the CPU record keeps float32 values.
  #quad = {
    parentTransform0: vec4.create(),
    parentTransform1: vec4.create(),
    parentTransform2: vec4.create(),
    localTransform0: vec4.create(),
    localTransform1: vec4.create(),
    localTransform2: vec4.create(),
    color: vec4.create(),
    brightness: new Float32Array(2)
  };

  /**
   * Caches the effect key and rebuilds static local transforms
   * (EveChildQuad.cpp:53-65).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2QuadRenderer::Instance() is engine-owned; Initialize caches the effect key and defers effect registration to RegisterWithQuadRenderer.")
  Initialize()
  {
    if (this.effect)
    {
      this.#effectKey = Number(this.effect.GetHashValue?.() ?? 0) >>> 0;
    }
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }
    return true;
  }

  /**
   * The quad's name.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the quad's name, coercing the value to a string.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Forwards to the base transform setup (EveChildQuad.cpp:82-85). */
  @carbon.method
  @impl.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /** Registers the effect bucket with a quad renderer (EveChildQuad.cpp:87-93). */
  @carbon.method
  @impl.adapted
  @impl.reason("The quad renderer is an injected engine-owned capability; the Carbon arguments are forwarded through a duck-typed contract.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.effect)
    {
      quadRenderer?.RegisterEffect?.(
        this.#effectKey,
        TriBatchType.TRIBATCHTYPE_ADDITIVE,
        EveChildQuad.QUAD_INSTANCE_SIZE,
        1,
        EveChildQuad.GetQuadDefinition(),
        this.effect
      );
    }
  }

  /** Submits the current instance record when visible (EveChildQuad.cpp:95-101). */
  @carbon.method
  @impl.adapted
  @impl.reason("The quad renderer is an injected engine-owned capability; the CPU-side instance record is submitted through a duck-typed contract.")
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (this.display && this.effect && this.#isVisible)
    {
      quadRenderer?.AddQuads?.(this.#effectKey, this.#quad, 1);
    }
  }

  /** Quads render through the quad renderer, never as renderables (EveChildQuad.cpp:103-105). */
  @carbon.method
  @impl.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /**
   * Unit quad bound: sphere (0,0,0,sqrt(2)) transformed by the world transform
   * (EveChildQuad.cpp:107-112).
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.set(out, 0, 0, 0, Math.SQRT2);
    sph3.transformMat4(out, out, this.worldTransform);
    return true;
  }

  /**
   * Always false: a quad renders only through the quad renderer, never as a transparent batch.
   */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon's batch hook is empty - quads only draw through the quad renderer (EveChildQuad.cpp:119-121). */
  @carbon.method
  @impl.noop
  GetBatches(_batches, _batchType, _perObjectData, _reason)
  {
    return false;
  }

  /** Distance from the view position to the world translation (EveChildQuad.cpp:123-128). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z);
  }

  /**
   * Edit-mode effect-key refresh (EveChildQuad.cpp:131-149): when the effect
   * hash changes the quad re-registers its renderer bucket.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon re-registers through the Tr2QuadRenderer singleton; the relocated renderer arrives via the threaded update context when present.")
  UpdateSyncronous(updateContext, _params)
  {
    if (!this.editMode)
    {
      return;
    }
    if (this.effect)
    {
      const key = Number(this.effect.GetHashValue?.() ?? 0) >>> 0;
      if (key !== this.#effectKey)
      {
        this.#effectKey = key;
        const quadRenderer = updateContext?.GetQuadRenderer?.() ?? updateContext?.quadRenderer;
        if (quadRenderer)
        {
          this.RegisterWithQuadRenderer(quadRenderer);
        }
      }
    }
    else
    {
      this.#effectKey = 0;
    }
  }

  /**
   * Rebuilds the world transform and packs the CPU-side instance record
   * (EveChildQuad.cpp:151-171). Each transform is stored as three Vector4 rows
   * (_11,_21,_31,_41 / _12,_22,_32,_42 / _13,_23,_33,_43), which on the shared
   * D3D-row-major / GL-column-major byte layout is the column-stride pattern
   * (m[0],m[4],m[8],m[12]) etc. - matching the Carbon Float4x3 packing rule.
   */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(_updateContext, params)
  {
    const parentTransform = params?.localToWorldTransform ?? EveChildQuad.#identity;
    this.UpdateTransform(parentTransform);
    const quad = this.#quad;
    vec4.set(quad.parentTransform0, parentTransform[0], parentTransform[4], parentTransform[8], parentTransform[12]);
    vec4.set(quad.parentTransform1, parentTransform[1], parentTransform[5], parentTransform[9], parentTransform[13]);
    vec4.set(quad.parentTransform2, parentTransform[2], parentTransform[6], parentTransform[10], parentTransform[14]);
    vec4.set(quad.localTransform0, this.localTransform[0], this.localTransform[4], this.localTransform[8], this.localTransform[12]);
    vec4.set(quad.localTransform1, this.localTransform[1], this.localTransform[5], this.localTransform[9], this.localTransform[13]);
    vec4.set(quad.localTransform2, this.localTransform[2], this.localTransform[6], this.localTransform[10], this.localTransform[14]);
    vec4.copy(quad.color, this.color);
    quad.brightness[0] = this.brightness;
    quad.brightness[1] = 0;
    this.#hasUpdated = true;
  }

  /**
   * Frustum/screen-size visibility for the unit quad bound
   * (EveChildQuad.cpp:173-196).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and LOD factor are read from the explicit update context; a missing frustum is treated as visible.")
  UpdateVisibility(updateContext, _parentTransform, _parentLod)
  {
    if (!this.#hasUpdated || !this.display)
    {
      this.#isVisible = false;
      this.currentScreenSize = -1;
      return;
    }
    const sphere = EveChildQuad.#sphere;
    vec4.set(sphere, 0, 0, 0, Math.SQRT2);
    sph3.transformMat4(sphere, sphere, this.worldTransform);
    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    if (frustum?.IsSphereVisible?.(sphere) !== false)
    {
      this.currentScreenSize = Number(frustum?.GetPixelSizeAccross?.(sphere) ?? Infinity);
      const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
      this.#isVisible = this.currentScreenSize >= this.minScreenSize * lodFactor;
    }
    else
    {
      this.currentScreenSize = -1;
      this.#isVisible = false;
    }
  }

  /** Returns the local-to-world matrix (EveChildQuad.cpp:198-201). */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /** Carbon declares ChangeLOD inline empty (EveChildQuad.h:40). */
  @carbon.method
  @impl.noop
  ChangeLOD(_lod)
  {
  }

  /** Quads carry no per-object data (EveChildQuad.cpp:203-206). */
  @carbon.method
  @impl.implemented
  GetPerObjectData(_accumulator)
  {
    return null;
  }

  /**
   * The shared quad vertex definition (EveChildQuad.cpp:33-51): one per-vertex
   * corner index plus a per-instance record of six float4 transform rows, a
   * half4 color and a half2 brightness. Element records mirror the Carbon
   * Tr2VertexDefinition::Add(type, usage, usageIndex, stream, stepRate) calls.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2VertexDefinition is a native layout builder; the same elements are published as a frozen descriptor list for the engine to realize.")
  static GetQuadDefinition()
  {
    return EveChildQuad.#quadDefinition;
  }

  /** sizeof(EveChildQuad::Quad): 6 * 16 + 4 * 2 + 2 * 2 bytes. */
  static QUAD_INSTANCE_SIZE = 108;

  static #quadDefinition = Object.freeze([
    Object.freeze({ type: "FLOAT32_1", usage: "TEXCOORD", usageIndex: 5, stream: 0, stepRate: 0 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 0, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 1, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 2, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 3, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 4, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT32_4", usage: "POSITION", usageIndex: 5, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT16_4", usage: "TEXCOORD", usageIndex: 0, stream: 1, stepRate: 1 }),
    Object.freeze({ type: "FLOAT16_2", usage: "TEXCOORD", usageIndex: 1, stream: 1, stepRate: 1 })
  ]);

  static #identity = mat4.create();

  static #sphere = vec4.create();

}
