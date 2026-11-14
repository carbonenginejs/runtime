// Ours: what the readers ask about a class beyond Carbon's ClassInfo: its
// persisted members as their VarEntry rows, and the interfaces they test
// for with BlueCastPtr in Carbon. The schema's compile fills it
// (compileClassInfo), walking the rows as Carbon's IRootReaderBase::FindEntry
// does (IRootReader.cpp:303-319): the class's table, then each parent's, a row
// with PERSIST, first name wins.

/**
 * The persisted members of a class by name, and the interfaces the readers ask about.
 */
export class ClassInfoMeta
{
  /** Ours: the registered name, which minification cannot change. */
  static className = "ClassInfoMeta";

  /**
   * The persisted members by name.
   *
   * @type {Map<string, import("./VarEntry.js").VarEntry>}
   */
  entries = new Map();

  /** Whether the class maps IInitialize. @type {boolean} */
  isInitialize = false;

  /** Whether the class maps INotify. @type {boolean} */
  isNotify = false;

  /** Whether the class is an IBlueObjectProxy. @type {boolean} */
  isProxy = false;

  /** Whether the class maps ICustomPersist. @type {boolean} */
  isCustomPersist = false;
}
