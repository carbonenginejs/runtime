import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `npccorporations.fsdbinary` bytes.
 *
 * `DesignerDescriptionID`, `descriptionID`, `nameID` are localisation label
 * identifiers; resolve them through `CjsFsdLocalization`.
 *
 * `shares` exceeds 2^53 - the largest published value is 81,682,500,000 - so it
 * is read as a 64-bit integer. `minSecurity` and `sizeFactor` are doubles,
 * which is unremarkable; `taxRate` is not, and is described below.
 *
 * **`taxRate` needs `Math.fround` to match the export.** It is a `FLOAT_32`
 * that CCP publishes after a single-precision round trip: 29 of 283 records
 * disagree when compared at double precision, and all 283 agree after
 * `Math.fround`.
 *
 * **`divisions` is a 20-byte inner map, not 16.** A record-size sweep cannot
 * settle this - the entry count is stored, so every candidate size "passes",
 * exactly as it does for a list. 20 was pinned from values; 16 produces
 * convincingly wrong shifted records.
 *
 * **One presence bit in `divisions` is an honest gap.** Its inner presence word
 * reads `0x1` on all 247 entries, so exactly one of `divisionNumber`,
 * `leaderID` and `size` is optional and nothing in this build says which. The
 * schema records the bit and assigns it to none of them. A future build that
 * omits one settles it.
 *
 * **The alphabetical presence run is ASCII-ordered and skips required fields.**
 * Capital-D `DesignerDescriptionID` sorts before every lowercase name and so
 * takes bit 0, and `publicShares` - always zero, which makes it look optional -
 * is skipped because it is required. Both cost the first bit assignment.
 *
 * **Two encodings of one concept live in this record.** `exchangeRates` is an
 * 8-byte inner map with a `FLOAT_32` value; `corporationTrades` is 16 bytes
 * with a `FLOAT_64`. Both map a corporation to a rate.
 */
class CjsFsd64SchemaNpcCorporations extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "npcCorporations",
    "schemaVersion": 1,
    "path": "res:/staticdata/npccorporations.fsdbinary",
    "schemaID": "81c6a1728e899b7270ab47cd5c67cb9f",
    "container": {
      "type": "MAP",
      "recordSize": 224,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 220,
        "allowedMask": 1048575
      },
      "fields": [{
        "name": "allowedMemberRaces",
        "type": "LIST",
        "offset": 8,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "sourceName": "allowedMemberRaces",
        "presenceMask": 2
      }, {
        "name": "corporationTrades",
        "type": "MAP",
        "offset": 16,
        "recordSize": 16,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "FLOAT_64",
          "offset": 8
        },
        "sourceName": "corporationTrades",
        "presenceMask": 8
      }, {
        "name": "divisions",
        "type": "MAP",
        "offset": 32,
        "recordSize": 20,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "presence": {
          "type": "UINT_32",
          "offset": 16,
          "allowedMask": 1
        },
        "fields": [{
          "name": "divisionNumber",
          "type": "UINT_32",
          "offset": 4,
          "sourceName": "divisionNumber"
        }, {
          "name": "leaderID",
          "type": "UINT_32_IDENTIFIER",
          "offset": 8,
          "sourceName": "leaderID"
        }, {
          "name": "size",
          "type": "UINT_32",
          "offset": 12,
          "sourceName": "size"
        }],
        "sourceName": "divisions",
        "presenceMask": 32
      }, {
        "name": "exchangeRates",
        "type": "MAP",
        "offset": 48,
        "recordSize": 8,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "FLOAT_32",
          "offset": 4
        },
        "sourceName": "exchangeRates",
        "presenceMask": 128
      }, {
        "name": "extent",
        "type": "STRING",
        "offset": 64,
        "sourceName": "extent"
      }, {
        "name": "investors",
        "type": "MAP",
        "offset": 72,
        "recordSize": 8,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "UINT_32",
          "offset": 4
        },
        "sourceName": "investors",
        "presenceMask": 2048
      }, {
        "name": "lpOfferTables",
        "type": "LIST",
        "offset": 88,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "sourceName": "lpOfferTables",
        "presenceMask": 4096
      }, {
        "name": "minSecurity",
        "type": "FLOAT_64",
        "offset": 96,
        "sourceName": "minSecurity"
      }, {
        "name": "shares",
        "type": "UINT_64",
        "offset": 104,
        "sourceName": "shares"
      }, {
        "name": "size",
        "type": "STRING",
        "offset": 112,
        "sourceName": "size"
      }, {
        "name": "sizeFactor",
        "type": "FLOAT_64",
        "offset": 120,
        "sourceName": "sizeFactor",
        "presenceMask": 65536
      }, {
        "name": "tickerName",
        "type": "STRING",
        "offset": 128,
        "sourceName": "tickerName"
      }, {
        "name": "url",
        "type": "STRING",
        "offset": 136,
        "sourceName": "url",
        "presenceMask": 524288
      }, {
        "name": "DesignerDescriptionID",
        "type": "UINT_32",
        "offset": 144,
        "sourceName": "DesignerDescriptionID",
        "presenceMask": 1
      }, {
        "name": "ceoID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 148,
        "sourceName": "ceoID",
        "presenceMask": 4
      }, {
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 152,
        "sourceName": "descriptionID",
        "presenceMask": 16
      }, {
        "name": "enemyID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 156,
        "sourceName": "enemyID",
        "presenceMask": 64
      }, {
        "name": "factionID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 160,
        "sourceName": "factionID",
        "presenceMask": 256
      }, {
        "name": "friendID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 164,
        "sourceName": "friendID",
        "presenceMask": 512
      }, {
        "name": "iconID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 168,
        "sourceName": "iconID",
        "presenceMask": 1024
      }, {
        "name": "initialPrice",
        "type": "UINT_32",
        "offset": 172,
        "sourceName": "initialPrice"
      }, {
        "name": "mainActivityID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 176,
        "sourceName": "mainActivityID",
        "presenceMask": 8192
      }, {
        "name": "memberLimit",
        "type": "INT_32",
        "offset": 180,
        "sourceName": "memberLimit"
      }, {
        "name": "minimumJoinStanding",
        "type": "INT_32",
        "offset": 184,
        "sourceName": "minimumJoinStanding"
      }, {
        "name": "nameID",
        "type": "UINT_32",
        "offset": 188,
        "sourceName": "nameID"
      }, {
        "name": "publicShares",
        "type": "UINT_32",
        "offset": 192,
        "sourceName": "publicShares"
      }, {
        "name": "raceID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 196,
        "sourceName": "raceID",
        "presenceMask": 16384
      }, {
        "name": "secondaryActivityID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 200,
        "sourceName": "secondaryActivityID",
        "presenceMask": 32768
      }, {
        "name": "solarSystemID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 204,
        "sourceName": "solarSystemID",
        "presenceMask": 131072
      }, {
        "name": "stationID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 208,
        "sourceName": "stationID",
        "presenceMask": 262144
      }, {
        "name": "taxRate",
        "type": "FLOAT_32",
        "offset": 212,
        "sourceName": "taxRate"
      }, {
        "name": "deleted",
        "type": "BOOLEAN",
        "offset": 216,
        "bit": 0,
        "sourceName": "deleted"
      }, {
        "name": "hasPlayerPersonnelManager",
        "type": "BOOLEAN",
        "offset": 217,
        "bit": 0,
        "sourceName": "hasPlayerPersonnelManager"
      }, {
        "name": "sendCharTerminationMessage",
        "type": "BOOLEAN",
        "offset": 218,
        "bit": 0,
        "sourceName": "sendCharTerminationMessage"
      }, {
        "name": "uniqueName",
        "type": "BOOLEAN",
        "offset": 219,
        "bit": 0,
        "sourceName": "uniqueName"
      }]
    }
  }));
}

export { CjsFsd64SchemaNpcCorporations };
//# sourceMappingURL=CjsFsd64SchemaNpcCorporations.js.map
