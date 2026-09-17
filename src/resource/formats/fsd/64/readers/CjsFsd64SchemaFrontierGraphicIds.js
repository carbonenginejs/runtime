import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied graphic identifier bytes **as EVE Frontier stores them**.
 *
 * The record is 168 bytes against Tranquility's 160, and every field this schema
 * claims sits eight bytes later than its counterpart in
 * `CjsFsd64SchemaGraphicIds`. The two are separate pinned layouts rather than
 * versions of one, so a caller picks the one its target ships.
 *
 * The one structural difference is that **Frontier's record carries a presence
 * word, at 164, and Tranquility's does not**. Where the EVE container leaves an
 * absent string empty, this one also clears a bit, and each bit below was solved
 * by requiring it to be set on exactly the records whose string is non-empty -
 * an exact match on every one of the 3,267 records, not an implication.
 *
 * Derived against build 3512930, from `app:/bin64/graphicIDsLoader.pyd`'s field
 * list, with the SOF names checked against what the target's own space object
 * factory data names. Counts: `graphicFile` on 1,950 records, `iconFolder` 313,
 * `sofFactionName` 1,775, `sofHullName` 1,157, `sofLayout` 1,270 and
 * `sofRaceName` 1,916.
 *
 * The record carries further fields this schema does not claim - the colour
 * vectors in the four-byte float slots from 104, and the animation and explosion
 * identifiers. Two are measurable but unidentified: a data pointer at 24, whose
 * 948 strings are SOF-shaped names that overlap `sofHullName`'s vocabulary, and
 * pointers at 8 and 32 that are non-zero on every record. `sofMaterialSetID` is
 * **not claimed**: the only candidate slot holds one non-zero value across the
 * file and it is not a key in Frontier's two-record material set table, so
 * nothing proves the offset.
 */
export class CjsFsd64SchemaFrontierGraphicIds extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "graphicIDs",
        "schemaVersion": 1,
        "path": "res:/staticdata/graphicids.fsdbinary",
        "schemaID": "2bdea664c47b290277ceb9741651e981",
        "container": {
            "type": "MAP",
            "recordSize": 168,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 164,
                "allowedMask": 32767
            },
            "fields": [
                {
                    "name": "graphicFile",
                    "type": "STRING",
                    "offset": 48,
                    "presenceMask": 128
                },
                {
                    "name": "iconFolder",
                    "type": "STRING",
                    "offset": 56,
                    "presenceMask": 512
                },
                {
                    "name": "sofFactionName",
                    "type": "STRING",
                    "offset": 72,
                    "presenceMask": 1024
                },
                {
                    "name": "sofHullName",
                    "type": "STRING",
                    "offset": 80,
                    "presenceMask": 2048
                },
                {
                    "name": "sofLayout",
                    "type": "LIST",
                    "offset": 88,
                    "itemSize": 8,
                    "maximumCount": 256,
                    "presenceMask": 4096,
                    "item": {
                        "type": "STRING",
                        "offset": 0
                    }
                },
                {
                    "name": "sofRaceName",
                    "type": "STRING",
                    "offset": 96,
                    "presenceMask": 16384
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaFrontierGraphicIds();
