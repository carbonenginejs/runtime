import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `typedogma.fsdbinary` bytes.
 *
 * Decodes each type's dogma attributes and effects. The record itself carries
 * nothing but the type identifier and two list pointers, so there is no
 * presence word to honour; an absent list is an absent pointer.
 *
 * The attribute item stores its payload before its key — `value` at 0 and
 * `attributeID` at 8 — which reads as a mistake until you notice that the
 * eight-byte double has to be aligned and the four-byte identifier does not.
 *
 * Offsets were solved against CCP's published export at build 3466501 and
 * verified on every one of its 26,828 records, both lists exact.
 */
class CjsFsd64SchemaTypeDogma extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "typeDogma",
    "schemaVersion": 1,
    "path": "res:/staticdata/typedogma.fsdbinary",
    "schemaID": "817d560b9962768e1a4b18598e9a1761",
    "container": {
      "type": "MAP",
      "recordSize": 24,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "dogmaAttributes",
        "type": "LIST",
        "offset": 8,
        "itemSize": 16,
        "item": {
          "type": "OBJECT",
          "fields": [{
            "name": "value",
            "type": "FLOAT_64",
            "offset": 0
          }, {
            "name": "attributeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 8
          }]
        }
      }, {
        "name": "dogmaEffects",
        "type": "LIST",
        "offset": 16,
        "itemSize": 8,
        "item": {
          "type": "OBJECT",
          "fields": [{
            "name": "effectID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 0
          }, {
            "name": "isDefault",
            "type": "BOOLEAN",
            "offset": 4,
            "bit": 0
          }]
        }
      }]
    }
  }));
}

export { CjsFsd64SchemaTypeDogma };
//# sourceMappingURL=CjsFsd64SchemaTypeDogma.js.map
