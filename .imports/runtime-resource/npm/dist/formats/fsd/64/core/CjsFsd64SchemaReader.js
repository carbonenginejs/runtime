import { CjsFsd64SchemaDecoder } from './CjsFsd64SchemaDecoder.js';

/**
 * Base class for file-specific readers defined by JSON-shaped JavaScript layouts.
 */
class CjsFsd64SchemaReader {
  /**
   * Decodes bytes to the existing private Map-based reader representation.
   */
  Read(bytes) {
    return CjsFsd64SchemaDecoder.read(bytes, this.constructor.getFsdSchema());
  }

  /**
   * Decodes bytes to a plain JSON-compatible value with lossless identities.
   */
  ReadJSON(bytes) {
    return CjsFsd64SchemaDecoder.readJSON(bytes, this.constructor.getFsdSchema());
  }

  /** Returns the binary-layout schema owned by a reader class. */
  static getFsdSchema() {
    throw new Error("FSD schema reader must define static getFsdSchema().");
  }

  /** Bind one inline schema to a subclass-owned getFsdSchema function. */
  static bindFsdSchema(schema) {
    return () => schema;
  }

  /** Returns the logical resource path declared by the schema. */
  static get path() {
    return this.getFsdSchema().path;
  }

  /** Returns the binary schema identity declared by the schema. */
  static get schemaID() {
    return this.getFsdSchema().schemaID;
  }
}

export { CjsFsd64SchemaReader };
//# sourceMappingURL=CjsFsd64SchemaReader.js.map
