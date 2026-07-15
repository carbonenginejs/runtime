import { CjsYamlFormat } from '../../yaml/CjsYamlFormat.js';

/**
 * Keys added by authoring tools are prefixed with a double underscore and are
 * not part of the Red data. They can carry environment-specific information, so
 * they are stripped on every read and never emitted.
 * @param {string} key
 * @returns {boolean}
 */
function isStrippedKey(key) {
  return typeof key === "string" && key.length > 1 && key[0] === "_" && key[1] === "_";
}

/**
 * Parses Red input into a plain object graph.
 *
 * Accepts an already-parsed object (returned as-is) or a YAML string. YAML
 * anchors/aliases resolve to shared object identities, which the reader uses
 * to rebuild the Red reference graph.
 *
 * @param {unknown} input parsed Red object or YAML string
 * @param {object} [options] `options.parse(text)` overrides the built-in parser
 * @param {string} [readerName]
 * @returns {object} parsed Red object graph
 */
function parseRed(input, options = {}, readerName = "CjsRedFormat") {
  if (input && typeof input === "object") return input;
  if (typeof input === "string") {
    if (typeof options.parse === "function") return options.parse(input);
    return CjsYamlFormat.readRaw(input, {
      tagPolicy: "reject"
    });
  }
  throw new TypeError(`${readerName}: input must be a parsed Red object or a YAML string.`);
}

/**
 * A "typed table" is Red's compact columnar encoding: a `structure` array of
 * `[name, typeCode, byteOffset]` columns plus an `items` array where each row
 * is one record aligned to those columns. Curve `keys`, effect `options`, and
 * `samplerOverrides` all use this shape.
 * @param {*} node
 * @returns {boolean}
 */
function isTypedTable(node) {
  return Boolean(node && typeof node === "object" && !Array.isArray(node) && Array.isArray(node.structure) && Array.isArray(node.items));
}

/**
 * Decodes a typed table into an array of row objects keyed by column name.
 * @param {object} node typed table (`{ structure, items }`)
 * @returns {Array<object>}
 */
function decodeTypedTable(node) {
  const columns = node.structure.map(column => Array.isArray(column) ? column[0] : column && column.name);
  return node.items.map(row => {
    const record = {};
    const cells = Array.isArray(row) ? row : [row];
    for (let i = 0; i < columns.length; i++) {
      if (columns[i] === undefined || columns[i] === null) continue;
      record[columns[i]] = cells[i];
    }
    return record;
  });
}

export { decodeTypedTable, isStrippedKey, isTypedTable, parseRed };
//# sourceMappingURL=redGraph.js.map
