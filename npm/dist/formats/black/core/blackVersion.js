import { CJS_BLACK_FOURCC, CJS_BLACK_VERSION, CJS_BLACK_FORMAT_ID, CJS_BLACK_EXTENSION } from './blackConstants.js';
import { version as version$1, schema as schema$1, generatedAt as generatedAt$1 } from './blackDefinitions.js';

const extension = CJS_BLACK_EXTENSION;
const formatId = CJS_BLACK_FORMAT_ID;
const fourcc = CJS_BLACK_FOURCC;
const formatVersion = CJS_BLACK_VERSION;
const generatedAt = generatedAt$1;
const schema = schema$1;
const version = version$1;
var blackVersion = Object.freeze({
  extension,
  formatId,
  formatVersion,
  fourcc,
  generatedAt,
  schema,
  version
});

export { blackVersion as default, extension, formatId, formatVersion, fourcc, generatedAt, schema, version };
//# sourceMappingURL=blackVersion.js.map
