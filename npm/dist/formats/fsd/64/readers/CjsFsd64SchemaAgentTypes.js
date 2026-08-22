import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `agenttypes.fsdbinary` bytes.
 *
 * This is a scalar-valued map - a `uint32` key and a bare string, with no
 * record of named fields at all. `agenttypesloader` naming no fields is the
 * evidence for that, not a failure to read it: a loader with an empty field run
 * is how this format spells a map whose value is a single value.
 */
class CjsFsd64SchemaAgentTypes extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "agentTypes",
    "schemaVersion": 1,
    "path": "res:/staticdata/agenttypes.fsdbinary",
    "schemaID": "887f6fefedee7215c178f4db09731a3d",
    "container": {
      "type": "MAP",
      "recordSize": 16,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "value": {
        "type": "STRING",
        "offset": 8
      }
    }
  }));
}

export { CjsFsd64SchemaAgentTypes };
//# sourceMappingURL=CjsFsd64SchemaAgentTypes.js.map
