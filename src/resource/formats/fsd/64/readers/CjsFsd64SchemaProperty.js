import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `property.fsdbinary` bytes: EVE Frontier's material
 * properties, from build 3573151.
 *
 * A 40-byte record per property - `density`, `melting point`, `thermal
 * conductivity` and 26 more - naming how values combine (`mergeMethod`:
 * `average`, `min`, `max` or `weighted_average`) and the property's natural
 * range. `neoTypeProperty` and `traitProperty` key into it by `propertyID`.
 *
 * Field names and their order come from `app:/bin64/propertyLoader.pyd`
 * (`mergeMethod, name, bridgedAttributeID, naturalMax, naturalMin`). Measured on
 * all 29 records of build 3573151:
 *
 * - `mergeMethod` and `name` are strings at 8 and 16; every pointer resolves to
 *   text and every name is distinct.
 * - `naturalMax` and `naturalMin` are float32 at 28 and 32: the value at 28 is
 *   not below the one at 32 on any record (`corrosion rate` runs -6 to 2,
 *   `strength` 1 to 450), and presence bits 1 and 2 are set on every record.
 * - **`bridgedAttributeID` at 24 under bit 0 is inferred, not measured.** The
 *   slot is zero and bit 0 is clear on every record, so neither its offset nor
 *   its type has been observed holding a value; it is placed there because it
 *   is the one loader field and the one slot left over.
 */
export class CjsFsd64SchemaProperty extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "property",
        "schemaVersion": 1,
        "path": "res:/staticdata/property.fsdbinary",
        "schemaID": "846890cdfd7ee2e5917e924ceda70c72",
        "container": {
            "type": "MAP",
            "recordSize": 40,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 36,
                "allowedMask": 7
            },
            "fields": [
                {
                    "name": "mergeMethod",
                    "type": "STRING",
                    "offset": 8
                },
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 16
                },
                {
                    "name": "bridgedAttributeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 24,
                    "presenceMask": 1
                },
                {
                    "name": "naturalMax",
                    "type": "FLOAT_32",
                    "offset": 28,
                    "presenceMask": 2
                },
                {
                    "name": "naturalMin",
                    "type": "FLOAT_32",
                    "offset": 32,
                    "presenceMask": 4
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaProperty();
