// Source: blue/include/BlueFileUtil.h, blue/src/BlueFileUtil.cpp
//
// The res-path helpers the paths service and its file systems share. Carbon
// declares them as free functions; here they are statics of one class, so a
// caller imports one name and the helpers stay findable by their Carbon names.
//
// Only the helpers the file systems use are ported so far.

/** Carbon's `BlueFileUtil` free functions, as statics. */
export class BlueFileUtil
{
  static className = "BlueFileUtil";

  /**
   * `GetResProtocol` (BlueFileUtil.cpp:236-247): the text before the first
   * `:`, such as `res` or `dynamic`, or `null` when the path has no protocol.
   *
   * Adapted: returns the protocol or `null`, where Carbon returns false and
   * writes the protocol to an out-parameter.
   *
   * @param {string} path Resource path.
   * @returns {string|null} The protocol, or `null`.
   */
  static getResProtocol(path)
  {
    const pos = path.indexOf(":");
    if (pos === -1) return null;
    return path.slice(0, pos);
  }

  /**
   * `SubstituteBlackForRedInFilename` (BlueFileUtil.cpp:374-387): a `.red`
   * path as its `.black` twin; any other path unchanged. The client ships red
   * files compiled, so a file system asked for one reads the other.
   *
   * @param {string} filename Resource path.
   * @returns {string} The path to read.
   */
  static substituteBlackForRedInFilename(filename)
  {
    const dot = filename.lastIndexOf(".");
    if (dot !== -1 && filename.slice(dot) === ".red") return `${filename.slice(0, -3)}black`;
    return filename;
  }

  /**
   * `SubstituteRedForBlackInFilename` (BlueFileUtil.cpp:390-403): a `.black`
   * path as its `.red` twin; any other path unchanged.
   *
   * @param {string} filename Resource path.
   * @returns {string} The path to report.
   */
  static substituteRedForBlackInFilename(filename)
  {
    const dot = filename.lastIndexOf(".");
    if (dot !== -1 && filename.slice(dot) === ".black") return `${filename.slice(0, -5)}red`;
    return filename;
  }
}
