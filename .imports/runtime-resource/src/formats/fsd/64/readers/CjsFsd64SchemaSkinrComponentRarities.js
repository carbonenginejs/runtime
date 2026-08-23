import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `ship_skin_design_component_rarities.fsdbinary` bytes.
 *
 * The six rarity tiers, each a localised name and a rank. `rank` and the
 * record key happen to hold the same six values, so the two were told apart by
 * the loader's field order rather than by their contents.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
export class CjsFsd64SchemaSkinrComponentRarities extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "skinrComponentRarities",
        "schemaVersion": 1,
        "path": "res:/staticdata/ship_skin_design_component_rarities.fsdbinary",
        "schemaID": "e07fc7c3925f2ee23f72e9dc1f496aa4",
        "container": {
            "type": "MAP",
            "recordSize": 12,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 4,
                    "sourceName": "name",
                    "renamed": true
                },
                {
                    "name": "rank",
                    "type": "UINT_32",
                    "offset": 8,
                    "sourceName": "rank"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaSkinrComponentRarities();
