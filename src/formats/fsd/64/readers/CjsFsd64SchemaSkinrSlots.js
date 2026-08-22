import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `ship_cosmetic_slots.fsdbinary` bytes.
 *
 * The eight cosmetic slots, each naming the design-component categories it
 * accepts.
 *
 * `internalNameID` is a reference into `skinrSlotNames` - slot 5 resolves to
 * `pattern`, slot 6 to `pattern_material`. It was first read as a repeated
 * record key, because the two tables are one-to-one and the values therefore
 * match the key on all eight rows. Only the loader's field list distinguishes
 * the two readings, which is the argument for recording `sourceName`.
 *
 * CCP's export publishes neither it nor `descriptionID`, whose label reads
 * `DO NOT TRANSLATE - DEBUG` on every slot.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
export class CjsFsd64SchemaSkinrSlots extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "skinrSlots",
        "schemaVersion": 1,
        "path": "res:/staticdata/ship_cosmetic_slots.fsdbinary",
        "schemaID": "482cf3464798a55849582ce140076805",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "allowedDesignComponentCategories",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "sourceName": "allowed_design_component_categories"
                },
                {
                    "name": "category",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 16,
                    "sourceName": "category"
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 20,
                    "sourceName": "description",
                    "renamed": true
                },
                {
                    "name": "internalNameID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 24,
                    "sourceName": "internal_name",
                    "renamed": true
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 28,
                    "sourceName": "name",
                    "renamed": true
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaSkinrSlots();
