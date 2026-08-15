/**
 * Column names, taken from the `CREATE TABLE` text SQLite stores verbatim.
 *
 * There is no column catalogue in the file: `sqlite_master` keeps the original
 * statement and nothing else, so the names have to come from parsing it. This
 * reads the column list only — enough to name values — and does not attempt to
 * understand types, constraints or expressions.
 */

/** Matches the identifier forms SQLite accepts for a column name. */
const IDENTIFIER = /^(?:"((?:[^"]|"")*)"|`((?:[^`]|``)*)`|\[([^\]]*)\]|([A-Za-z_][A-Za-z0-9_$]*))/u;

/** Clauses that begin a table constraint rather than a column definition. */
const CONSTRAINTS = new Set([
  "constraint", "primary", "unique", "check", "foreign"
]);

/**
 * Splits the column list at top-level commas.
 *
 * Depth tracking matters because a column can carry a parenthesised type or
 * check, and quoted text can contain either a comma or a bracket.
 */
function SplitColumns(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if (quote) {
      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
    } else if (character === "[") {
      quote = "]";
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(body.slice(start));

  return parts;
}

/**
 * Returns the column names declared by one `CREATE TABLE` statement.
 *
 * @param {string} sql Statement as stored in `sqlite_master`.
 * @returns {{ names: string[], rowidAlias: number }} Names in declaration
 *   order, and the index of an `INTEGER PRIMARY KEY` column if there is one.
 */
export function ReadColumns(sql) {
  const open = sql.indexOf("(");
  const close = sql.lastIndexOf(")");

  if (open < 0 || close < open) {
    return { names: [], rowidAlias: -1 };
  }

  const names = [];
  let rowidAlias = -1;

  for (const part of SplitColumns(sql.slice(open + 1, close))) {
    const text = part.trim();

    if (!text) {
      continue;
    }

    const match = IDENTIFIER.exec(text);

    if (!match) {
      continue;
    }

    const name = (match[1] ?? match[2] ?? match[3] ?? match[4])
      .replace(/""/gu, "\"").replace(/``/gu, "`");

    // A table-level constraint is not a column, and its first word says so.
    if (!match[1] && !match[2] && !match[3] && CONSTRAINTS.has(name.toLowerCase())) {
      continue;
    }

    // An INTEGER PRIMARY KEY column IS the rowid: its record value is stored
    // as NULL and the real value only exists in the cell's rowid field.
    if (/^\s*integer\s+primary\s+key\b/iu.test(text.slice(match[0].length))) {
      rowidAlias = names.length;
    }

    names.push(name);
  }

  return { names, rowidAlias };
}

export default ReadColumns;
