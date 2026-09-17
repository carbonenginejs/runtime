// Source: blue/include/IBluePaths.h
//
// The paths service as a browser can answer it. Carbon asks its file system;
// here the same questions are answered from a res file index the composer
// supplies - the "fake local machine", which is what a browser has instead of
// a disk it may walk.
//
// WHY THIS IS INSTALLED BY DEFAULT WHERE THE MANAGER IS NOT. An uncomposed
// resource manager cannot answer "fetch me this" at all, so it throws. An
// uncomposed paths service CAN answer "is this file here": no, it is not.
// Carbon returns exactly that for a file absent from the local machine
// (`FileExistsLocally`, IBluePaths.h:38), and every caller is written for the
// answer already - `Tr2Mesh::InitializeGeometryResource` takes the authored
// path when the probe says no. Throwing instead would make "no index" a
// different case from "no such file", which it is not.
//
// The verbs this cannot answer without a real file system stay refused, from
// IBluePaths. They are not no-ops: a caller that needs a directory listing or a
// stream needs a service that has one.
import { CjsSchema, carbon, impl } from "#schema";
import { IBluePaths } from "./IBluePaths.js";

/** Browser paths service: res-file-index existence, with the file-system verbs still refused. */
export class CjsBluePaths extends IBluePaths
{
  #index = null;

  /**
   * Installs the synchronous res-file index these questions are answered from.
   *
   * Accepts a predicate or any membership collection. A collection is compared
   * case-insensitively, as Carbon's file system does. Null uninstalls, after
   * which nothing is presumed to exist.
   *
   * @param {((path: string) => boolean)|Iterable<string>|Set<string>|Map<string, *>|null} index Index or predicate.
   * @returns {CjsBluePaths} This service.
   */
  SetResourceFileIndex(index = null)
  {
    if (index === null || index === undefined)
    {
      this.#index = null;
      return this;
    }
    if (typeof index === "function")
    {
      this.#index = path => Boolean(index(path));
      return this;
    }
    if (index instanceof Set || index instanceof Map)
    {
      this.#index = path => index.has(path);
      return this;
    }
    if (typeof index[Symbol.iterator] === "function")
    {
      const names = new Set(Array.from(index, name => String(name ?? "").toLowerCase()));
      this.#index = path => names.has(String(path ?? "").toLowerCase());
      return this;
    }
    throw new TypeError(
      "CjsBluePaths.SetResourceFileIndex expects a predicate, an iterable of paths, a Set, a Map, or null."
    );
  }

  /** Whether an index is installed at all, which composition asks and callers do not. */
  HasResourceFileIndex()
  {
    return this.#index !== null;
  }

  /**
   * `FileExistsLocally` - whether the index says this file is here.
   *
   * False with no index installed, which is what keeps a caller on the path it
   * was authored with rather than guessing a sibling exists.
   */
  FileExistsLocally(path)
  {
    if (!this.#index || !path) return false;
    return Boolean(this.#index(path));
  }

  /**
   * `FileExists` - the same question, since a browser has no second place to
   * look. Carbon distinguishes the local disk from stuff files and the remote
   * cache; a res file index is one list.
   */
  FileExists(path)
  {
    return this.FileExistsLocally(path);
  }
}

CjsSchema.define(CjsBluePaths, {
  className: "CjsBluePaths",
  family: "blue",
  fields: {},
  methods: {
    FileExistsLocally: [ carbon.method, impl.implemented ],
    FileExists: [ carbon.method, impl.adapted, impl.reason("Carbon separates the local disk from stuff files and the remote cache; a res file index is one list, so both questions have one answer.") ],
    SetResourceFileIndex: [ impl.custom, impl.reason("Carbon's file system needs no installing. A browser has no disk to walk, so the index it answers from is supplied by composition.") ],
    HasResourceFileIndex: [ impl.custom, impl.reason("Composition asks whether it has installed an index; a caller never does, because 'no index' and 'no such file' are one answer.") ]
  }
});
