import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `contrabandtypes.fsdbinary` bytes.
 *
 * The record is a type identifier and one inner map: faction identifier to the
 * four penalties that faction applies. The inner record is 20 bytes and
 * 4-aligned, not 8-aligned - inner records do not inherit the outer record's
 * alignment.
 */
class CjsFsd64SchemaContrabandTypes extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "contrabandTypes",
    "schemaVersion": 1,
    "path": "res:/staticdata/contrabandtypes.fsdbinary",
    "schemaID": "1b39d6c55cea4bf923932da20733eb75",
    "container": {
      "type": "MAP",
      "recordSize": 24,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "factions",
        "type": "MAP",
        "offset": 8,
        "recordSize": 20,
        "sourceName": "factions",
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "fields": [{
          "name": "attackMinSec",
          "type": "FLOAT_32",
          "offset": 4,
          "sourceName": "attackMinSec"
        }, {
          "name": "confiscateMinSec",
          "type": "FLOAT_32",
          "offset": 8,
          "sourceName": "confiscateMinSec"
        }, {
          "name": "fineByValue",
          "type": "FLOAT_32",
          "offset": 12,
          "sourceName": "fineByValue"
        }, {
          "name": "standingLoss",
          "type": "FLOAT_32",
          "offset": 16,
          "sourceName": "standingLoss"
        }]
      }]
    }
  }));
}

export { CjsFsd64SchemaContrabandTypes };
//# sourceMappingURL=CjsFsd64SchemaContrabandTypes.js.map
