// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { assertCarbonRecord } from "../../format/carbonRecordGuard.js";

import {
} from "#utils/is";
import { copyBytes } from "#utils/bytes";
import { Tr2EffectStageInput } from "./Tr2EffectStageInput.js";
import {
  recordBytes,
  recordText,
  toRecordBlob,
  toRecordText
} from "./carbonRecordFields.js";

/** Reflected shader-library metadata. */
export class Tr2EffectLibrary
{
  /** Stable name independent of minification; no registry is required. */
  static className = "Tr2EffectLibrary";

  /** payloadSize (uint32_t) */
  payloadSize = 0;

  /** libraryHandle (uint32_t) */
  libraryHandle = 0;

  /** rayGenName (BlueSharedStringW) */
  rayGenName = "";

  /** missName (BlueSharedStringW) */
  missName = "";

  /** closestHitName (BlueSharedStringW) */
  closestHitName = "";

  /** anyHitName (BlueSharedStringW) */
  anyHitName = "";

  /** intersectionName (BlueSharedStringW) */
  intersectionName = "";

  /** hitGroupName (BlueSharedStringW) */
  hitGroupName = "";

  /** globalInput (Tr2EffectStageInput), embedded by value (Tr2EffectDescription.h:227). */
  globalInput = new Tr2EffectStageInput();

  /** localInput (Tr2EffectStageInput), embedded by value (Tr2EffectDescription.h:228). */
  localInput = new Tr2EffectStageInput();

  /**
   * globalResourceSetDesc (Tr2ResourceSetDescriptionAL)
   *
   * Adapted: Carbon embeds it by value (Tr2EffectDescription.h:229), but the
   * class lives in trinityal, which the resource layer may not import
   * (layers.json), so the member starts null here.
   */
  globalResourceSetDesc = null;

  /**
   * Exact source library program metadata and owned bytes.
   *
   * Adapted: Carbon interns the library bytecode while reading
   * (Tr2EffectStateManager::RegisterShaderLibrary, .h:115) and keeps only libraryHandle.
   * Ours interns at the Trinity boundary instead, because the resource layer may not import
   * Trinity, so the bytes are retained until then; see
   * Tr2EffectStateManager.registerShaderHandles.
   * @meta.adapted
   */
  sourceProgram = null;

  /**
   * Portable export records retained before backend library registration.
   *
   * Adapted: Carbon resolves these exports into the interned library handle while reading;
   * the declarative export list is what survives until interning happens at the Trinity
   * boundary.
   * @meta.adapted
   */
  exports = [];

  /**
   * Build one raytracing library from its Carbon v15 description record.
   *
   * A library carries two `StageData` blocks of its own — a global and a local
   * input — which are the same block a stage carries, minus the stage wrapper.
   *
   * @param {object} record Carbon library record.
   * @returns {Tr2EffectLibrary} Reflected library.
   */
  static fromCarbonBinary(record)
  {
    assertCarbonRecord(record, "library");

    const library = new this();
    library.payloadSize = record.payloadSize;
    library.hitGroupName = recordText(record.hitGroupName);
    library.exports = record.exports.map(entry => ({
      type: entry.type,
      name: recordText(entry.name)
    }));
    // The export type is the only thing that names an entry point; the record
    // stores a flat list and the named fields are a view onto it.
    for (const entry of library.exports)
    {
      if (entry.type === 0) library.rayGenName = entry.name;
      if (entry.type === 1) library.missName = entry.name;
      if (entry.type === 2) library.closestHitName = entry.name;
      if (entry.type === 3) library.anyHitName = entry.name;
      if (entry.type === 4) library.intersectionName = entry.name;
    }
    library.sourceProgram = {
      kind: "library",
      bytes: copyBytes(recordBytes(record.shaderData)),
      shaderSize: record.shaderData.size,
      // See Tr2EffectStageInput: only a zero-size blob's word is portable.
      unsetOffset: record.shaderData.size === 0
        ? record.shaderData.offset
        : 0xffffffff
    };
    library.globalInput = Tr2EffectStageInput.fromCarbonBinaryInput(
      record.globalInputs
    );
    library.localInput = Tr2EffectStageInput.fromCarbonBinaryInput(
      record.localInputs
    );
    return library;
  }

  /**
   * Emit this library as a Carbon v15 record.
   *
   * `exports` is authoritative; the named entry-point fields are a view onto it
   * and are not written separately.
   *
   * @returns {object} Carbon library record.
   */
  toCarbonBinary()
  {
    const program = this.sourceProgram ?? {};
    return {
      payloadSize: this.payloadSize >>> 0,
      shaderData: toRecordBlob(
        program.bytes,
        program.shaderSize,
        program.unsetOffset
      ),
      exports: this.exports.map(entry => ({
        type: entry.type,
        name: toRecordText(entry.name)
      })),
      hitGroupName: toRecordText(this.hitGroupName),
      globalInputs: this.globalInput.toCarbonBinaryInput(),
      localInputs: this.localInput.toCarbonBinaryInput()
    };
  }
}
