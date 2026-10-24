// Source: trinity/trinity/Shader/Tr2EffectDescription.h
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp
import { assertCarbonRecord } from "../../format/carbonRecordGuard.js";

import { Tr2EffectParameterAnnotation } from "./Tr2EffectParameterAnnotation.js";
import { Tr2EffectTechnique } from "./Tr2EffectTechnique.js";
import { recordText, toRecordText } from "./carbonRecordFields.js";
import { compareUtf8 } from "../../format/compareUtf8.js";

/** Complete device-free effect description for one selected shader body. */
export class Tr2EffectDescription
{
  /** Stable name independent of minification; no registry is required. */
  static className = "Tr2EffectDescription";

  /** techniques (TrackableStdVector<Tr2EffectTechnique>) */
  techniques = [];

  /** annotations (Tr2EffectAnnotationMap) */
  annotations = new Map();

  /**
   * Build one complete effect description from its Carbon v15 record tree.
   *
   * This is the whole body: every technique, and the effect-level annotation
   * groups keyed by the parameter they annotate. Carbon sorts those keys by
   * `strcmp` on the way out, and the map preserves whatever order the file used,
   * so nothing here depends on the ordering being meaningful.
   *
   * @param {object} record Carbon effect description record.
   * @returns {Tr2EffectDescription} Reflected description.
   */
  static fromCarbonBinary(record)
  {
    assertCarbonRecord(record, "description");

    const effect = new this();
    effect.annotations = new Map();
    for (const group of record.annotations)
    {
      const parameterName = recordText(group.name);
      if (effect.annotations.has(parameterName))
      {
        throw new Error(
          `Carbon effect annotation group "${parameterName}" is duplicated`
        );
      }
      effect.annotations.set(
        parameterName,
        group.annotations.map(
          entry => Tr2EffectParameterAnnotation.fromCarbonBinary(entry)
        )
      );
    }
    effect.techniques = record.techniques.map(
      entry => Tr2EffectTechnique.fromCarbonBinary(entry)
    );
    return effect;
  }

  /**
   * Emit this description as a Carbon v15 record tree.
   *
   * Effect-level annotation groups are sorted by parameter name, and each
   * group's annotations by their own name, because Carbon sorts both by `strcmp`
   * before writing.
   *
   * @returns {object} Carbon effect description record.
   */
  toCarbonBinary()
  {
    return {
      techniques: this.techniques.map(technique => technique.toCarbonBinary()),
      annotations: Array.from(this.annotations, ([ name, annotations ]) => ({
        name: toRecordText(name),
        annotations: annotations
          .map(entry => entry.toCarbonBinary())
          .sort((left, right) => compareUtf8(left.name.value, right.name.value))
      })).sort((left, right) => compareUtf8(left.name.value, right.name.value))
    };
  }
}
