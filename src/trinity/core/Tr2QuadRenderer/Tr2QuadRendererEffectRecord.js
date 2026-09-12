// Source: trinity/trinity/Tr2QuadRenderer.h
//   trinity/trinity/Tr2QuadRenderer.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
// CPU half implemented 2026-07-23 (batch-plan P5 scene-global quad collector).
// The generator had flattened the internal EffectRecord/PerThreadData members
// onto the class; corrected to Carbon's nested shape. GPU realization (quad
// vertex/index buffers, ring instance buffer upload, vertex-declaration
// handles) is engine-owned and reads the merged CPU state emitted here.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";
import { TriBatchType } from "#consts/graphics";


/** One registered quad effect (Carbon Tr2QuadRenderer::EffectRecord). */
export class Tr2QuadRendererEffectRecord
{

  effect = null;

  batchType = 0;

  /** Size of one instance vertex in BYTES. */
  instanceSize = 0;

  /** Number of quads to render per instance. */
  quadCount = 0;

  /** Vertex definition (engine resolves the declaration handle from it). */
  definition = null;

  /** Byte offset of this record's instances in the merged buffer. */
  bufferOffset = 0;

  /** Number of instances merged this frame. */
  count = 0;

  /** Per-frame accumulation (Carbon's per-thread TLS collapses to one list). */
  pending = [];

  /** Bytes accumulated in pending. */
  addedSize = 0;

}
