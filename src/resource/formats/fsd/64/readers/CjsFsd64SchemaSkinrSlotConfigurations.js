import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `ship_cosmetic_slot_configurations.fsdbinary` bytes.
 *
 * Which slots a ship gets. One configuration applies to all ships and carries
 * `allowAllShips`; the rest name their ships explicitly. Both that flag and
 `ships` are presence-guarded, so a configuration says either "all" or "these"
 * and never both.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
export class CjsFsd64SchemaSkinrSlotConfigurations extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "skinrSlotConfigurations",
        "schemaVersion": 1,
        "path": "res:/staticdata/ship_cosmetic_slot_configurations.fsdbinary",
        "schemaID": "723dfdc8ea43fdc560cce51be4ed50e5",
        "container": {
            "type": "MAP",
            "recordSize": 48,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 40,
                "allowedMask": 3
            },
            "fields": [
                {
                    "name": "config",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "sourceName": "config"
                },
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "name"
                },
                {
                    "name": "ships",
                    "type": "LIST",
                    "offset": 24,
                    "itemSize": 4,
                    "presenceMask": 2,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "sourceName": "ships"
                },
                {
                    "name": "priority",
                    "type": "UINT_32",
                    "offset": 32,
                    "sourceName": "priority"
                },
                {
                    "name": "allowAllShips",
                    "type": "BOOLEAN",
                    "offset": 36,
                    "bit": 0,
                    "presenceMask": 1,
                    "sourceName": "allow_all_ships"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaSkinrSlotConfigurations();
