import { CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { isPlainObject } from '@carbonenginejs/runtime-utils/is';
import { recordText } from './carbonRecordFields.js';

// Source: trinity/trinity/Shader/Tr2EffectDescription.h

/** Reflected shader constant metadata. */
class Tr2EffectConstant extends CjsModel {
  /** name (BlueSharedString) */
  name = "";

  /** offset (unsigned) */
  offset = 0;

  /** size (unsigned) */
  size = 0;

  /** type (Type - enum Type) */
  type = 0;

  /** dimension (unsigned) */
  dimension = 0;

  /** elements (unsigned) */
  elements = 0;

  /** isSRGB (bool) */
  isSRGB = false;

  /** isAutoregister (bool) */
  isAutoregister = false;

  /**
   * Build one constant from its Carbon v15 description record.
   *
   * The record's numeric fields are already the widths Carbon declares, so this
   * is a rename plus the two byte-to-bool conversions; only `name` needs
   * dereferencing, because strings live in the container's arena.
   *
   * @param {object} record Carbon constant record.
   * @returns {Tr2EffectConstant} Reflected constant.
   */
  static fromCarbonBinary(record) {
    if (!isPlainObject(record)) {
      throw new TypeError("Carbon effect constant record must be an object");
    }
    const constant = new this();
    constant.name = recordText(record.name);
    constant.offset = record.offset;
    constant.size = record.size;
    constant.type = record.type;
    constant.dimension = record.dimension;
    constant.elements = record.elements;
    constant.isSRGB = !!record.isSRGB;
    constant.isAutoregister = !!record.isAutoregister;
    return constant;
  }
  static Type = Object.freeze({
    FLOAT: 0,
    INT: 1,
    UINT: 2,
    BOOL: 3,
    OTHER: 4
  });
}

// Declared imperatively rather than with decorators, so this module stays plain
// ESM that loads from source without a transform, which lets its tests import
// source instead of build output.
//
// Field order matters: it drives GetValues() export order. Statics belong in
// `methods` here rather than in a decorateMethod() call, which targets the
// prototype and would register a static as an instance field.
CjsSchema.define(Tr2EffectConstant, {
  className: "Tr2EffectConstant",
  family: "shader",
  fields: [{
    name: "name",
    type: {
      kind: "string"
    }
  }, {
    name: "offset",
    type: {
      kind: "uint32"
    }
  }, {
    name: "size",
    type: {
      kind: "uint32"
    }
  }, {
    name: "type",
    enum: {
      enumType: "Type"
    },
    type: {
      kind: "int32"
    }
  }, {
    name: "dimension",
    type: {
      kind: "uint32"
    }
  }, {
    name: "elements",
    type: {
      kind: "uint32"
    }
  }, {
    name: "isSRGB",
    type: {
      kind: "boolean"
    }
  }, {
    name: "isAutoregister",
    type: {
      kind: "boolean"
    }
  }]
});

export { Tr2EffectConstant };
//# sourceMappingURL=Tr2EffectConstant.js.map
