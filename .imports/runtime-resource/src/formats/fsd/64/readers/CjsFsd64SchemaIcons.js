import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `iconids.fsdbinary` bytes.
 *
 * The icon table: one resource path per icon identifier. The file is
 * `iconids` and CCP's export table is `icons`, which is why a filename search
 * never found it - the count sweep did, on 4,658 records matching 4,658 rows.
 *
 * `iconType` and `obsolete` are in the record and absent from the export.
 * `iconType` is not a type in any useful sense: its values include the empty
 * string, `png`, and `LifeSupport_unit.png`.
 *
 * Field names came from `iconIDsLoader.pyd`; offsets were solved against CCP's
 * published export at build 3466501, all 4,658 records exact.
 */
export class CjsFsd64SchemaIcons extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "icons",
        "schemaVersion": 1,
        "path": "res:/staticdata/iconids.fsdbinary",
        "schemaID": "e62746ff0dc540cc73e06fca63926f29",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 28,
                "allowedMask": 7
            },
            "fields": [
                {
                    "name": "iconFile",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "iconFile",
                    "presenceMask": 1
                },
                {
                    "name": "iconType",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "iconType",
                    "presenceMask": 2
                },
                {
                    "name": "obsolete",
                    "type": "BOOLEAN",
                    "offset": 24,
                    "bit": 0,
                    "sourceName": "obsolete",
                    "presenceMask": 4
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaIcons();
