// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/Tr2PerObjectData.h (Tr2PerObjectData base)
//
// GPU-free base for per-object render data. Carries the object id (Carbon's
// m_userData, used as the picking / object id) and is the value a renderable's
// GetPerObjectData returns and a batch references via SetPerObjectData. The
// concrete GPU upload path (Carbon SetPerObjectDataToDevice / ApplyConstantBuffers,
// which write Tr2ConstantBufferAL) is engine-owned and intentionally not modelled
// here; the engine reads whatever data a concrete subclass exposes at dispatch.

/**
 * GPU-free base for per-object render data, carrying the object id a batch is
 * picked and identified by; the GPU upload path is engine-owned.
 */
class Tr2PerObjectData {
  /** Starts with a zero object id. */
  constructor() {
    this.userData = 0;
  }

  /** Sets the object id, coerced to an unsigned 32-bit value. */
  SetUserData(userData) {
    this.userData = userData >>> 0;
  }

  /** The object id, which doubles as the picking id. */
  GetUserData() {
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
  static VertexFamilyMask = Tr2PerObjectData.StageBits.vs | Tr2PerObjectData.StageBits.cs | Tr2PerObjectData.StageBits.gs | Tr2PerObjectData.StageBits.hs | Tr2PerObjectData.StageBits.ds;

  // Carbon SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  // (Tr2PerObjectData.cpp:47-67 Standard, :75-96 Skinned). This is the CPU half:
  // it answers WHICH payload binds to WHICH stages for a given technique, and
  // the engine does the uploading. It is the join Carbon makes per batch, where
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
   * The per-object constant records to bind for a technique's shader-type mask:
   * one entry per payload that has a stage in common with the mask, carrying the
   * bytes and the stages to bind them to. Accepts a single record, a { vs, ps }
   * pair, or null, which is every shape a renderable's GetPerObjectData returns.
   */
  static getConstantRecords(objectData, shaderTypeMask) {
    const mask = shaderTypeMask >>> 0;
    if (!objectData || !mask) return [];
    const records = [];
    for (const payload of Tr2PerObjectData.#payloadsOf(objectData)) {
      const stages = payload?.GetLayout?.()?.stages;
      if (!stages) continue;
      let declared = 0;
      for (const stage of stages) {
        declared |= stage === "vs" ? Tr2PerObjectData.VertexFamilyMask : Tr2PerObjectData.StageBits[stage] ?? 0;
      }
      const stageMask = declared & mask;
      if (stageMask) {
        records.push({
          stageMask,
          data: payload.GetData(),
          struct: payload.GetStruct()
        });
      }
    }
    return records;
  }

  /** The payloads carried by a single record or a { vs, ps } pair. */
  static #payloadsOf(objectData) {
    if (typeof objectData.GetLayout === "function") return [objectData];
    return [objectData.vs, objectData.ps].filter(Boolean);
  }
}

export { Tr2PerObjectData };
//# sourceMappingURL=Tr2PerObjectData.js.map
