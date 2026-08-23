import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `stationoperations.fsdbinary` bytes.
 *
 * `descriptionID`, `operationNameID` are localisation label identifiers;
 * resolve them through `CjsFsdLocalization`.
 *
 * `manufacturingFactor` and `researchFactor` are stored as doubles rather than
 * the single-precision floats most of this format uses, so they need no
 * rounding on the way out.
 *
 * `stationTypes` is present-but-empty on 8 records, and the exporter drops an
 * empty map exactly as it drops an absent one, so the presence bit does not
 * predict what the export publishes. `CjsFsd64SchemaExpertSystems` carries the same
 * trap and describes it at length.
 */
class CjsFsd64SchemaStationOperations extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "stationOperations",
    "schemaVersion": 1,
    "path": "res:/staticdata/stationoperations.fsdbinary",
    "schemaID": "8d1167a29fb37cd42de4f7440206f63e",
    "container": {
      "type": "MAP",
      "recordSize": 88,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 80,
        "allowedMask": 3
      },
      "fields": [{
        "name": "manufacturingFactor",
        "type": "FLOAT_64",
        "offset": 8,
        "sourceName": "manufacturingFactor"
      }, {
        "name": "researchFactor",
        "type": "FLOAT_64",
        "offset": 16,
        "sourceName": "researchFactor"
      }, {
        "name": "services",
        "type": "LIST",
        "offset": 24,
        "sourceName": "services",
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "stationTypes",
        "type": "MAP",
        "offset": 32,
        "sourceName": "stationTypes",
        "presenceMask": 2,
        "recordSize": 8,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 4
        }
      }, {
        "name": "activityID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 48,
        "sourceName": "activityID"
      }, {
        "name": "border",
        "type": "FLOAT_32",
        "offset": 52,
        "sourceName": "border"
      }, {
        "name": "corridor",
        "type": "FLOAT_32",
        "offset": 56,
        "sourceName": "corridor"
      }, {
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 60,
        "sourceName": "descriptionID",
        "presenceMask": 1
      }, {
        "name": "fringe",
        "type": "FLOAT_32",
        "offset": 64,
        "sourceName": "fringe"
      }, {
        "name": "hub",
        "type": "FLOAT_32",
        "offset": 68,
        "sourceName": "hub"
      }, {
        "name": "operationNameID",
        "type": "UINT_32",
        "offset": 72,
        "sourceName": "operationNameID"
      }, {
        "name": "ratio",
        "type": "FLOAT_32",
        "offset": 76,
        "sourceName": "ratio"
      }]
    }
  }));
}

export { CjsFsd64SchemaStationOperations };
//# sourceMappingURL=CjsFsd64SchemaStationOperations.js.map
