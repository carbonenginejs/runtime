import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `agentsinspace.fsdbinary` bytes.
 *
 * Four identifiers and no text, so this table needs no localisation. The key is
 * the agent.
 */
class CjsFsd64SchemaAgentsInSpace extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "agentsInSpace",
    "schemaVersion": 1,
    "path": "res:/staticdata/agentsinspace.fsdbinary",
    "schemaID": "e988f3b0c8940ca01fb730e9ff6c2618",
    "container": {
      "type": "MAP",
      "recordSize": 20,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "dungeonID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 4,
        "sourceName": "dungeonID"
      }, {
        "name": "solarSystemID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 8,
        "sourceName": "solarSystemID"
      }, {
        "name": "spawnPointID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 12,
        "sourceName": "spawnPointID"
      }, {
        "name": "typeID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 16,
        "sourceName": "typeID"
      }]
    }
  }));
}

export { CjsFsd64SchemaAgentsInSpace };
//# sourceMappingURL=CjsFsd64SchemaAgentsInSpace.js.map
