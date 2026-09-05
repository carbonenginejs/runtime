// Source: trinity/Tr2PerObjectData.h (Tr2PerObjectData base)
//
// Per-object render data. Carries the object id (Carbon's m_userData, used as
// the picking / object id) and is the value a renderable's GetPerObjectData
// returns and a batch references via SetPerObjectData.
//
// THIS HEAD COMMENT USED TO SAY the upload path was "engine-owned and
// intentionally not modelled here; the engine reads the canonical
// CjsConstantPayload at dispatch". That was the engine-means-`engine/webgpu`
// misreading: Carbon's SetPerObjectDataToDevice calls FillAndSetConstants,
// which lives in Tr2RenderUtils.h - Trinity. The upload is here now and it
// writes a Tr2ConstantBufferAL through the abstraction layer.
//
// ApplyConstantBuffers, the indirect-draw sibling, is still unported: it takes
// a Tr2IndirectDrawBufferWriter and nothing on this path draws indirectly yet.

import { CjsConstantPayload } from "#contracts";
import { ShaderType } from "#consts/render-context";
import { FillAndSetConstants } from "../Tr2RenderUtils.js";
import { PER_OBJECT_PS, PER_OBJECT_VS } from "../Tr2Renderer.js";

/**
 * Per-object render data: the object id a batch is picked and identified by,
 * and the upload of its constant payloads through the abstraction layer.
 */
export class Tr2PerObjectData
{
  /** Starts with a zero object id. */
  constructor()
  {
    this.userData = 0;
  }

  /** Sets the object id, coerced to an unsigned 32-bit value. */
  SetUserData(userData)
  {
    this.userData = userData >>> 0;
  }

  /** The object id, which doubles as the picking id. */
  GetUserData()
  {
    return this.userData;
  }

  // Carbon Tr2RenderContextEnum::ShaderType (trinityal/Tr2RenderContextEnum.h:31-43).
  // The order is the bit order used by every constant-binding mask.

  /** Carbon's shader-type vocabulary, in its declared order. */
  static ShaderType = Object.freeze({
    VERTEX_SHADER: 0,
    PIXEL_SHADER: 1,
    COMPUTE_SHADER: 2,
    GEOMETRY_SHADER: 3,
    HULL_SHADER: 4,
    DOMAIN_SHADER: 5
  });

  /** A layout stage name to its shader-type bit. */
  static StageBits = Object.freeze({
    vs: 1 << 0,
    ps: 1 << 1,
    cs: 1 << 2,
    gs: 1 << 3,
    hs: 1 << 4,
    ds: 1 << 5
  });

  // Carbon's perFrameVsMask (Tr2PerObjectData.cpp:49-54): a payload declared
  // for the vertex stage is bound to the whole non-pixel family, because those
  // stages share the per-object vertex register. A struct declaring "vs" is
  // therefore asking for all five, exactly as Carbon's fill does.

  /** The stages a "vs" payload binds to, per Carbon's per-object VS mask. */
  static VertexFamilyMask =
    Tr2PerObjectData.StageBits.vs
    | Tr2PerObjectData.StageBits.cs
    | Tr2PerObjectData.StageBits.gs
    | Tr2PerObjectData.StageBits.hs
    | Tr2PerObjectData.StageBits.ds;

  // Carbon SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  // (Tr2PerObjectData.cpp:47-67 Standard, :75-96 Skinned). getConstantRecords
  // answers WHICH payload binds to WHICH stages for a given technique;
  // SetPerObjectDataToDevice above then uploads them. It is the join Carbon
  // makes per batch, where
  // RenderBatchGroup hoists currentShader->GetShaderTypeMask(technique) once per
  // group and passes it to every batch in that group.
  //
  // A zero mask binds nothing, matching FillAndSetConstants' early return
  // (Tr2RenderUtils.cpp:104-107), so a record is omitted rather than emitted
  // empty.
  //
  // DELIBERATE DEVIATION, because Carbon's two subclasses disagree and one
  // generic path cannot reproduce both. Tr2PerObjectDataStandard binds its
  // PIXEL payload UNMASKED - it passes the PIXEL_SHADER enum straight through,
  // so the pixel constant buffer is filled and bound even for a technique with
  // no pixel stage - while Tr2PerObjectDataSkinned gates the same payload on
  // (constantTypeMask & (1 << PIXEL_SHADER)). This port takes the gated form
  // for every struct. See docs/research/carbon-known-defects.md CE-19.

  /**
   * Uploads this object's per-object constants and binds them.
   *
   * Carbon `Tr2PerObjectDataStandard::SetPerObjectDataToDevice`
   * (`Tr2PerObjectData.cpp:47-67`), which is two `FillAndSetConstants` calls
   * and nothing else.
   *
   * THE CPU HALF WAS ALREADY HERE - `getConstantRecords` below answers which
   * payload binds to which stages, gated on the technique's mask. What was
   * missing was this last hop, because it was believed to be work for the
   * `engine/webgpu` package rather than for Trinity calling the abstraction
   * layer. `FillAndSetConstants` is in `Tr2RenderUtils.h`, which is Trinity.
   *
   * ONE BUFFER PER STAGE, SUPPLIED BY THE CALLER, as Carbon does: the context
   * owns a small array of per-object constant buffers and hands the same ones
   * to every batch in a group, so the buffer is created once and refilled per
   * object rather than allocated per draw.
   *
   * STATIC, TAKING THE DATA, WHERE CARBON'S IS A VIRTUAL ON IT - and this is
   * forced rather than chosen. Carbon dispatches on the subclass
   * (`Tr2PerObjectDataStandard` / `Tr2PerObjectDataSkinned`), but almost
   * nothing here is a `Tr2PerObjectData` instance: every renderable's
   * `GetPerObjectData` returns a plain `{ vs, ps }` pair of `RawData` records,
   * and only `EveChildCloud2` constructs the class at all. Written as an
   * instance method it would answer for `this` - which has no payloads - and
   * silently upload nothing. `getConstantRecords` beside it is static for the
   * same reason and takes the same argument.
   *
   * @param {object} objectData A `{ vs, ps }` pair, a single payload, or null.
   * @param {Array<object>} buffers A `Tr2ConstantBufferAL` per `ShaderType`.
   * @param {number} constantTypeMask The technique's shader-type mask.
   * @param {object} renderContext The context to upload and bind against.
   * @returns {number} How many payloads were uploaded.
   */
  static setPerObjectDataToDevice(objectData, buffers, constantTypeMask, renderContext)
  {
    let uploaded = 0;

    for (const record of Tr2PerObjectData.getConstantRecords(objectData, constantTypeMask))
    {
      // The register is the payload's own: a pixel payload binds at the
      // per-object PS register, everything else at the VS one. Carbon picks
      // between exactly these two the same way.
      const isPixel = record.stageMask === Tr2PerObjectData.StageBits.ps;
      const buffer = buffers[isPixel ? ShaderType.PIXEL_SHADER : ShaderType.VERTEX_SHADER];

      if (!buffer) continue;

      const bound = FillAndSetConstants(
        buffer,
        record.data,
        record.data.byteLength,
        record.stageMask,
        isPixel ? PER_OBJECT_PS : PER_OBJECT_VS,
        renderContext
      );

      if (bound) uploaded += 1;
    }

    return uploaded;
  }

  /**
   * The per-object constant records to bind for a technique's shader-type mask:
   * one entry per payload that has a stage in common with the mask, carrying the
   * bytes and the stages to bind them to. Accepts a single record, a { vs, ps }
   * pair, or null, which is every shape a renderable's GetPerObjectData returns.
   */
  static getConstantRecords(objectData, shaderTypeMask)
  {
    const mask = shaderTypeMask >>> 0;

    if (!objectData || !mask) return [];

    const records = [];

    for (const payload of Tr2PerObjectData.#payloadsOf(objectData))
    {
      const stages = payload.GetLayout().stages;

      if (!stages) continue;

      let declared = 0;

      for (const stage of stages)
      {
        declared |= stage === "vs"
          ? Tr2PerObjectData.VertexFamilyMask
          : (Tr2PerObjectData.StageBits[stage] ?? 0);
      }

      const stageMask = declared & mask;

      if (stageMask)
      {
        records.push({
          stageMask,
          payload,
          data: payload.GetData(),
          struct: payload.GetStruct()
        });
      }
    }

    return records;
  }

  /** The payloads carried by a single record or a { vs, ps } pair. */
  static #payloadsOf(objectData)
  {
    if (objectData instanceof CjsConstantPayload) return [ objectData ];

    return [ objectData.vs, objectData.ps ].filter(Boolean);
  }
}
