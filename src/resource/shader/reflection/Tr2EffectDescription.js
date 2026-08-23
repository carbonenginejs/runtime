// Source: trinity/trinity/Shader/Tr2EffectDescription.h
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp
import { CjsSchema, impl, type } from "#schema";
import { CjsModel } from "#model";
import { isPlainObject } from "#utils/is";
import { Tr2EffectParameterAnnotation } from "./Tr2EffectParameterAnnotation.js";
import { Tr2EffectTechnique } from "./Tr2EffectTechnique.js";
import { recordText, toRecordText } from "./carbonRecordFields.js";
import { compareUtf8 } from "../../format/compareUtf8.js";

/** Complete device-free effect description for one selected shader body. */
export class Tr2EffectDescription extends CjsModel
{

  /** techniques (TrackableStdVector<Tr2EffectTechnique>) */
  techniques = [];

  /** annotations (Tr2EffectAnnotationMap) */
  annotations = new Map();

  /**
   * Construct a canonical effect description from JS/JSON model values.
   *
   * @param {object} values Canonical model values.
   * @param {object} options CjsModel import options.
   * @returns {Tr2EffectDescription} Hydrated description.
   */
  static from(values = {}, options = {})
  {
    let normalized = values;
    let annotations = null;
    if (values && Object.hasOwn(values, "annotations"))
    {
      const entries = values.annotations instanceof Map
        ? values.annotations
        : Object.entries(values.annotations ?? {});
      annotations = new Map();
      for (const [ parameterName, records ] of entries)
      {
        if (!Array.isArray(records))
        {
          throw new TypeError(
            `Effect annotations for "${parameterName}" must be an array`
          );
        }
        annotations.set(
          String(parameterName),
          records.map(record => record instanceof Tr2EffectParameterAnnotation
            ? record
            : Tr2EffectParameterAnnotation.from(record, options))
        );
      }
      normalized = { ...values, annotations };
    }
    const effect = super.from(normalized, options);
    if (annotations)
    {
      effect.annotations = annotations;
    }
    return effect;
  }

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
    if (!isPlainObject(record))
    {
      throw new TypeError("Carbon effect description record must be an object");
    }

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

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectDescription, {
  className: "Tr2EffectDescription",
  family: "shader",
  fields: {
    techniques: type.list("Tr2EffectTechnique"),
    annotations: type.map("Tr2EffectParameterAnnotationMap")
  }
});
