import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `dogmaeffects.fsdbinary` bytes.
 *
 * Decodes effect definitions and their `modifierInfo` list, which is what makes
 * this table worth having: each entry names the attribute an effect modifies,
 * the attribute it modifies it by, and the operation between them.
 *
 * Two fields the client stores are absent from CCP's export — `sfxName`, whose
 * only non-empty value is the string `"None"`, and `effectID`, which repeats the
 * record key. The export also renames `effectName` to `name` and
 * `effectCategory` to `effectCategoryID`; this reader keeps the client's names.
 *
 * Field names and order were read from `dogmaEffectsLoader.pyd`; offsets and
 * presence masks were solved against CCP's published export at build 3466501,
 * unanimously over all 3,417 records and all 5,152 modifier entries.
 *
 * This is the one dataset of ten whose layout identity is not shared by all
 * three publishers: Infinity reads `3f128288…` where CCP and Serenity read
 * `b7107f57…`. The layout behind it is the same, which is why the second
 * identity is accepted rather than solved again — measured over the 3,366
 * effects Infinity shares with CCP, every field solves to the identical offset,
 * the presence union is `0xffff` on both, the modifier entry is the same 48
 * bytes, and 3,349 modifier lists decode identically. The seventeen that do not
 * are well-formed decodes of different values, which is Infinity being a
 * different world rather than the layout being different.
 */
class CjsFsd64SchemaDogmaEffects extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "dogmaEffects",
    "schemaVersion": 1,
    "path": "res:/staticdata/dogmaeffects.fsdbinary",
    "schemaID": "b7107f57fd413dd7f47a626dbc39abc9",
    "acceptedSchemaIDs": ["3f12828866ea55b2d241ad5dec1a10c0"],
    "container": {
      "type": "MAP",
      "recordSize": 112,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 108,
        "allowedMask": 65535
      },
      "fields": [{
        "name": "effectName",
        "type": "STRING",
        "offset": 8
      }, {
        "name": "guid",
        "type": "STRING",
        "offset": 16,
        "presenceMask": 128
      }, {
        "name": "modifierInfo",
        "type": "LIST",
        "offset": 24,
        "itemSize": 48,
        "presenceMask": 512,
        "item": {
          "type": "OBJECT",
          "presence": {
            "type": "UINT_32",
            "offset": 40,
            "allowedMask": 63
          },
          "fields": [{
            "name": "domain",
            "type": "STRING",
            "offset": 0
          }, {
            "name": "func",
            "type": "STRING",
            "offset": 8
          }, {
            "name": "effectID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 16,
            "presenceMask": 1
          }, {
            "name": "groupID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 20,
            "presenceMask": 2
          }, {
            "name": "modifiedAttributeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 24,
            "presenceMask": 4
          }, {
            "name": "modifyingAttributeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 28,
            "presenceMask": 8
          }, {
            "name": "operation",
            "type": "INT_32",
            "offset": 32,
            "presenceMask": 16
          }, {
            "name": "skillTypeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 36,
            "presenceMask": 32
          }]
        }
      }, {
        "name": "sfxName",
        "type": "STRING",
        "offset": 32,
        "presenceMask": 16384
      }, {
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 40,
        "presenceMask": 1
      }, {
        "name": "dischargeAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 44,
        "presenceMask": 2
      }, {
        "name": "displayNameID",
        "type": "UINT_32",
        "offset": 48,
        "presenceMask": 4
      }, {
        "name": "distribution",
        "type": "UINT_32",
        "offset": 52,
        "presenceMask": 8
      }, {
        "name": "durationAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 56,
        "presenceMask": 16
      }, {
        "name": "effectCategory",
        "type": "UINT_32",
        "offset": 60
      }, {
        "name": "effectID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 64
      }, {
        "name": "falloffAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 68,
        "presenceMask": 32
      }, {
        "name": "fittingUsageChanceAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 72,
        "presenceMask": 64
      }, {
        "name": "iconID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 76,
        "presenceMask": 256
      }, {
        "name": "npcActivationChanceAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 80,
        "presenceMask": 1024
      }, {
        "name": "npcUsageChanceAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 84,
        "presenceMask": 2048
      }, {
        "name": "rangeAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 88,
        "presenceMask": 4096
      }, {
        "name": "resistanceAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 92,
        "presenceMask": 8192
      }, {
        "name": "trackingSpeedAttributeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 96,
        "presenceMask": 32768
      }, {
        "name": "disallowAutoRepeat",
        "type": "BOOLEAN",
        "offset": 100,
        "bit": 0
      }, {
        "name": "electronicChance",
        "type": "BOOLEAN",
        "offset": 101,
        "bit": 0
      }, {
        "name": "isAssistance",
        "type": "BOOLEAN",
        "offset": 102,
        "bit": 0
      }, {
        "name": "isOffensive",
        "type": "BOOLEAN",
        "offset": 103,
        "bit": 0
      }, {
        "name": "isWarpSafe",
        "type": "BOOLEAN",
        "offset": 104,
        "bit": 0
      }, {
        "name": "propulsionChance",
        "type": "BOOLEAN",
        "offset": 105,
        "bit": 0
      }, {
        "name": "published",
        "type": "BOOLEAN",
        "offset": 106,
        "bit": 0
      }, {
        "name": "rangeChance",
        "type": "BOOLEAN",
        "offset": 107,
        "bit": 0
      }]
    }
  }));
}

export { CjsFsd64SchemaDogmaEffects };
//# sourceMappingURL=CjsFsd64SchemaDogmaEffects.js.map
