// Source: trinity/trinity/Eve/EveStarfield.h
// Source: trinity/trinity/Eve/EveStarfield.cpp
// Source: trinity/trinity/Eve/EveStarfield_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { meta } from "#schema";
import { IInitialize, INotify } from "#blue";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/index.js";

/** Defines a procedurally seeded starfield with distance, flashing, effect, and star-count controls. */
@meta.define({ className: "EveStarfield", family: "eve/effect", purpose: "Defines a procedurally seeded starfield with distance, flashing, effect, and star-count controls." })
@meta.blue.inherit(IInitialize, INotify)
export class EveStarfield
{

  /** m_seed (int32_t) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  seed = 0;

  /** m_minFlashIntensity (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minFlashIntensity = 0;

  /** m_maxDistance (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxDist = 300;

  /** m_minDistance (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minDist = 100;

  /** m_minFlashRate (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minFlashRate = 0.5;

  /** m_maxFlashRate (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxFlashRate = 1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** m_starCount (int32_t) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  numStars = 500;


  _dirty = false;

  _bytesPerVertex = 0;

  _vertexCount = 0;

  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  _vertexBuffer = new Tr2BufferAL();

  /** Registers the inherited native device-resource lifetime. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /** Explicit final-owner cleanup replaces C++ resource destruction. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

  /** Initializes device storage when creation is allowed (cpp:98-102). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.PrepareResources();
    return true;
  }

  /** Inherited Tr2DeviceResource.cpp:21-32 creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit AL destruction replaces native assignment to an empty buffer. */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /**
   * Generates the native packed sprite stream and uploads it (cpp:110-174).
   * The AL description replaces the C++ stride/count overload. The local
   * TriRand sequence preserves seeded stars without reseeding unrelated JS code.
   */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    if (this.numStars <= 0) return true;
    const declaration = EveStarfield.#declaration;
    if (declaration.empty())
    {
      declaration.Add("FLOAT32_3", "POSITION");
      for (let index = 0; index < 4; index++) declaration.Add("FLOAT32_1", "TEXCOORD", index);
      declaration.Add("UBYTE_4", "TEXCOORD", 4);
    }
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    this._vertexCount = this.numStars * 4;
    this._bytesPerVertex = 32;
    const bytes = GenerateVertices(this);
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const result = this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
      this._bytesPerVertex, this._vertexCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE
    ), bytes, context);
    if (Failed(result)) return false;
    Tr2Renderer.ReserveQuadListIndexBuffer(this.numStars);
    return true;
  }

  /** All notified changes request a regenerated seeded stream (cpp:176-181). */
  @meta.blue.method
  @meta.implemented
  OnModified(_name)
  {
    this._dirty = true;
    return true;
  }

  /** Regenerates dirty storage, retaining the retry flag after failure (cpp:183-193). */
  @meta.blue.method
  @meta.implemented
  Update(_time)
  {
    if (!this._dirty) return;
    this.ReleaseResources();
    if (this.PrepareResources()) this._dirty = false;
  }

  /** Returns the assigned star material (header:78-81). */
  @meta.blue.method
  @meta.implemented
  GetEffect()
  {
    return this.effect;
  }

  /** Assigns the material without regenerating vertices (header:83-86). */
  @meta.blue.method
  @meta.implemented
  SetEffect(effect)
  {
    this.effect = effect;
  }

  /** Submits the sprite quads through the existing shared index allocation (cpp:62-95). */
  @meta.blue.method
  @meta.implemented
  GetBatches(accumulator, perObjectData)
  {
    if (!this._vertexBuffer.IsValid() || !this.effect || !this.display || this.numStars <= 0) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    const indices = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indices.IsValid()) return;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, this._bytesPerVertex);
    batch.SetIndices(indices.GetBuffer(), indices.GetStride());
    batch.SetDrawIndexedInstanced(this.numStars * 6, 1, indices.GetStartIndex(), 0, 0);
    accumulator.Commit(batch);
  }

  static #declaration = new Tr2VertexDefinition();
}

/**
 * Packs StarfieldSpriteVertex (cpp:12-40): seven floats and four bytes.
 * Adapted: a local uint32 state implements TriSrand/TriRand (TriMath.cpp:972-996)
 * because JS has no Carbon global generator; the exact seeded sequence is kept.
 * Padding is deterministically zero instead of native uninitialized padding.
 */
function GenerateVertices(stars)
{
  const bytes = new Uint8Array(stars.numStars * 4 * 32); // alloc: regenerated native vertex payload
  const view = new DataView(bytes.buffer);
  let state = (stars.seed >>> 0) % 714025;
  const next = () => {
    state = ((((state << 12) >>> 0) + 150889) >>> 0) % 714025;
    return state;
  };
  const unit = () => Math.fround(next() / 714025);
  const f = Math.fround;
  for (let index = 0; index < stars.numStars; index++)
  {
    const angle = f(f(unit() * 2) * f(Math.PI));
    const z = f(f(unit() - 0.5) * 2);
    const distance = unit();
    const radius = f(stars.minDist + f(f(stars.maxDist - stars.minDist) * f(distance * distance)));
    const ring = f(Math.sqrt(f(1 - f(z * z))));
    const x = f(f(radius * ring) * f(Math.cos(angle)));
    const y = f(f(radius * ring) * f(Math.sin(angle)));
    const positionZ = f(radius * z);
    const color = unit();
    const intensity = f(f(unit() * f(1 - stars.minFlashIntensity)) + stars.minFlashIntensity);
    const phase = unit();
    const rate = f(f(unit() * f(stars.maxFlashRate - stars.minFlashRate)) + stars.minFlashRate);
    const texture = Math.trunc(4 * next() / 714025);
    for (let corner = 0; corner < 4; corner++)
    {
      const offset = (index * 4 + corner) * 32;
      view.setFloat32(offset, x, true);
      view.setFloat32(offset + 4, y, true);
      view.setFloat32(offset + 8, positionZ, true);
      view.setFloat32(offset + 12, color, true);
      view.setFloat32(offset + 16, intensity, true);
      view.setFloat32(offset + 20, phase, true);
      view.setFloat32(offset + 24, rate, true);
      view.setUint8(offset + 28, corner);
      view.setUint8(offset + 29, texture);
    }
  }
  return bytes;
}

meta.blue.interfaceTable({ interfaces: [EveStarfield, IInitialize, INotify], chainTo: null })(EveStarfield, { kind: "class" });
