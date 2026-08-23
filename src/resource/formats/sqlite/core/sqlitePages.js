/**
 * SQLite page and b-tree walking, for read-only full table scans.
 *
 * Only the table b-tree is walked. Index pages (`0x02` and `0x0a`) are never
 * visited, because every caller of this format scans a table rather than
 * looking a key up, and an index carries no data a table scan does not.
 */
import { ReadVarint, SqliteError } from "./sqliteRecords.js";

const HEADER_SIZE = 100;
const SIGNATURE = "SQLite format 3\0";
const PAGE_INTERIOR_TABLE = 0x05;
const PAGE_LEAF_TABLE = 0x0d;

/**
 * Reads and validates the hundred-byte database header.
 *
 * @param {Uint8Array} bytes Whole container.
 * @returns {object} Header fields this reader needs.
 */
export function ReadHeader(bytes) {
  if (bytes.byteLength < HEADER_SIZE) {
    throw SqliteError("A SQLite container is at least 100 bytes.");
  }

  const signature = new TextDecoder("latin1").decode(bytes.subarray(0, 16));

  if (signature !== SIGNATURE) {
    throw SqliteError("Not a SQLite container: the header signature does not match.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declared = view.getUint16(16, false);

  // 1 is the documented spelling of 65536, which does not fit the field.
  const pageSize = declared === 1 ? 65536 : declared;

  if (pageSize < 512 || (pageSize & (pageSize - 1)) !== 0) {
    throw SqliteError(`Invalid SQLite page size ${pageSize}.`);
  }

  const encoding = view.getUint32(56, false) || 1;

  return {
    pageSize,
    reserved: view.getUint8(20),
    encoding,
    pageCount: view.getUint32(28, false),
    usableSize: pageSize - view.getUint8(20)
  };
}

/**
 * Returns the bytes of one page, numbered from 1 as the format numbers them.
 */
function Page(bytes, header, pageNumber) {
  const start = (pageNumber - 1) * header.pageSize;

  if (start < 0 || start + header.pageSize > bytes.byteLength) {
    throw SqliteError(`Page ${pageNumber} is outside the container.`);
  }

  return bytes.subarray(start, start + header.pageSize);
}

/**
 * Joins a cell payload with its overflow chain.
 *
 * The split point is the fiddly part of the format: a payload larger than the
 * local maximum keeps `K` or `M` bytes on the page and puts the rest on a chain
 * of overflow pages, each beginning with a four-byte next-page pointer. Getting
 * this wrong truncates long values rather than failing, which is why the JSON
 * documents in these containers are the case that exposes it.
 */
function ReadPayload(bytes, header, page, offset, size) {
  const usable = header.usableSize;
  const maxLocal = usable - 35;
  let local = size;

  if (size > maxLocal) {
    const minLocal = Math.floor(((usable - 12) * 32) / 255) - 23;
    const K = minLocal + ((size - minLocal) % (usable - 4));

    local = K <= maxLocal ? K : minLocal;
  }

  const payload = new Uint8Array(size);

  payload.set(page.subarray(offset, offset + local), 0);

  if (local === size) {
    // Wholly local, so there is no overflow pointer after it to read - and on
    // the last cell of a page, reading one anyway runs off the end.
    return payload;
  }

  let written = local;
  let next = new DataView(page.buffer, page.byteOffset, page.byteLength)
    .getUint32(offset + local, false);

  while (written < size) {
    if (!next) {
      throw SqliteError("An overflow chain ended before the payload was complete.");
    }

    const overflow = Page(bytes, header, next);
    const view = new DataView(overflow.buffer, overflow.byteOffset, overflow.byteLength);
    const take = Math.min(usable - 4, size - written);

    payload.set(overflow.subarray(4, 4 + take), written);
    written += take;
    next = view.getUint32(0, false);
  }

  return payload;
}

/**
 * Walks one table b-tree and yields every leaf cell.
 *
 * @param {Uint8Array} bytes Whole container.
 * @param {object} header Parsed database header.
 * @param {number} rootPage Page number the table is rooted at.
 * @yields {{ rowid: number, payload: Uint8Array }} Each row.
 */
export function* TableRows(bytes, header, rootPage) {
  const stack = [ rootPage ];
  const seen = new Set();

  while (stack.length) {
    const pageNumber = stack.pop();

    // A malformed or hostile container could point a page at itself.
    if (seen.has(pageNumber)) {
      throw SqliteError(`Page ${pageNumber} appears twice in one b-tree.`);
    }

    seen.add(pageNumber);

    const page = Page(bytes, header, pageNumber);
    // Page 1 carries the database header before its b-tree header.
    const base = pageNumber === 1 ? HEADER_SIZE : 0;
    const view = new DataView(page.buffer, page.byteOffset, page.byteLength);
    const type = view.getUint8(base);
    const cellCount = view.getUint16(base + 3, false);

    if (type !== PAGE_LEAF_TABLE && type !== PAGE_INTERIOR_TABLE) {
      throw SqliteError(`Page ${pageNumber} is not a table b-tree page (type ${type}).`);
    }

    const headerSize = type === PAGE_INTERIOR_TABLE ? 12 : 8;
    const pointers = base + headerSize;

    if (type === PAGE_INTERIOR_TABLE) {
      // Children are in ascending key order, with the rightmost hanging off the
      // page header rather than off a cell. They go on the stack backwards so
      // that popping visits them in order: rows come out in rowid order, which
      // is what every other SQLite reader produces and what a caller diffing
      // two exports will assume.
      const children = [];

      for (let index = 0; index < cellCount; index += 1) {
        children.push(view.getUint32(view.getUint16(pointers + index * 2, false), false));
      }

      children.push(view.getUint32(base + 8, false));

      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push(children[index]);
      }

      continue;
    }

    for (let index = 0; index < cellCount; index += 1) {
      const cell = view.getUint16(pointers + index * 2, false);
      const size = ReadVarint(page, cell);
      const rowid = ReadVarint(page, cell + size.size);
      const start = cell + size.size + rowid.size;

      yield {
        rowid: rowid.value,
        payload: ReadPayload(bytes, header, page, start, size.value)
      };
    }
  }
}

export { HEADER_SIZE, SIGNATURE };
