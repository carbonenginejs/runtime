import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { CjsCharacterLibraryDocuments as _CjsCharacterLibraryD } from './CjsCharacterLibraryDocuments.js';

let _initClass, _init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_documents, _init_extra_documents;

/** Hydrated character library whose public fields have the same shape as its JSON values. */
let _CjsCharacterLibrary;
class CjsCharacterLibrary extends CjsModel {
  static {
    ({
      e: [_init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_documents, _init_extra_documents],
      c: [_CjsCharacterLibrary, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibrary",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "schema"], [[io, io.readwrite, type, type.uint32], 16, "schemaVersion"], [[io, io.readwrite, type, type.string], 16, "sourceTarget"], [[io, io.readwrite, type, type.string], 16, "sourceGame"], [[io, io.readwrite, type, type.string], 16, "sourceProvider"], [[io, io.readwrite, type, type.string], 16, "sourceBuild"], [[io, io.readwrite, type, type.string], 16, "generatedAt"], [[io, io.readwrite, void 0, type.model("CjsCharacterLibraryDocuments")], 16, "documents"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_documents(this);
  }
  schema = _init_schema(this, "carbonenginejs.characterLibrary");
  schemaVersion = (_init_extra_schema(this), _init_schemaVersion(this, 4));
  sourceTarget = (_init_extra_schemaVersion(this), _init_sourceTarget(this, null));
  sourceGame = (_init_extra_sourceTarget(this), _init_sourceGame(this, null));
  sourceProvider = (_init_extra_sourceGame(this), _init_sourceProvider(this, null));
  sourceBuild = (_init_extra_sourceProvider(this), _init_sourceBuild(this, null));
  generatedAt = (_init_extra_sourceBuild(this), _init_generatedAt(this, null));
  documents = (_init_extra_generatedAt(this), _init_documents(this, new _CjsCharacterLibraryD()));

  /** Lists the document collections declared by this library model. */
  ListDocuments() {
    return Object.keys(this.documents.GetValues());
  }

  /** Returns one hydrated document collection or null. */
  GetDocument(name) {
    const key = String(name);
    return Object.hasOwn(this.documents, key) ? this.documents[key] : null;
  }

  /** Returns whether a document contains a record with the requested source identity. */
  Has(documentName, recordID) {
    return this.Get(documentName, recordID) !== null;
  }

  /** Returns one hydrated source record by its named recordID field. */
  Get(documentName, recordID) {
    const document = this.GetDocument(documentName);
    const identity = String(recordID);
    if (!document) {
      return null;
    }
    return document.find(record => record.recordID === identity) ?? null;
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterLibrary as CjsCharacterLibrary };
//# sourceMappingURL=CjsCharacterLibrary.js.map
