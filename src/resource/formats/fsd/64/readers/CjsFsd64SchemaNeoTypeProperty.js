import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `neotypeproperty.fsdbinary` bytes: EVE Frontier's
 * material property ranges per type, from build 3573151.
 *
 * A map from typeID to a list of `{ maxValue, minValue, propertyID }`, the
 * range one type takes for each `property` it has. The keys are the types
 * whose `quantityKind` is set.
 *
 * Field names come from `app:/bin64/neoTypePropertyLoader.pyd` (`properties`
 * on the record; `maxValue, minValue, propertyID` on its list element).
 * Measured on all 22 records of build 3573151:
 *
 * - The record is 16 bytes, key at 0 and the `properties` list pointer at 8:
 *   the only stride that yields unique keys that are all typeIDs.
 * - An element is 16 bytes: float32 `maxValue` at 0 and `minValue` at 4, the
 *   `propertyID` at 8, and a presence word at 12. The value at 0 is not below
 *   the one at 4 wherever both are present (type 96701's first range is 1482
 *   to 1638), and every `propertyID` is a key of `property`.
 * - Bit 0 is `maxValue` and bit 1 `minValue`. Type 96052 - the one `discrete`
 *   type - sets only bit 1, carrying a minimum of 0.5 and no maximum.
 */
export class CjsFsd64SchemaNeoTypeProperty extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "neoTypeProperty",
        "schemaVersion": 1,
        "path": "res:/staticdata/neotypeproperty.fsdbinary",
        "schemaID": "ec3323d546b9a8b5e3762e20569340bc",
        "container": {
            "type": "MAP",
            "recordSize": 16,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "properties",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 16,
                    "item": {
                        "type": "OBJECT",
                        "presence": {
                            "type": "UINT_32",
                            "offset": 12,
                            "allowedMask": 3
                        },
                        "fields": [
                            {
                                "name": "maxValue",
                                "type": "FLOAT_32",
                                "offset": 0,
                                "presenceMask": 1
                            },
                            {
                                "name": "minValue",
                                "type": "FLOAT_32",
                                "offset": 4,
                                "presenceMask": 2
                            },
                            {
                                "name": "propertyID",
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 8
                            }
                        ]
                    }
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaNeoTypeProperty();
