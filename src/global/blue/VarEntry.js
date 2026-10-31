// Source: blueexposure/include/BlueTypes.h:321-375 (Be::VarEntry)
import { CjsSchema } from "#schema";

/**
 * One row of a class's member table: Carbon's `Be::VarEntry`, which
 * `MAP_ATTRIBUTE` and `MAP_PROPERTY*` push into the table `EXPOSURE_BEGIN`
 * starts (BlueExposureMacrosPython.h:35). Built once per class by
 * `ClassInfo.exposeToBlue` from the decorator metadata.
 *
 * Adapted: Carbon's `mOffset` and `mSize` locate the member's bytes in the
 * object; a JavaScript member is located by its property key, so `key` stands
 * in for both. Carbon's table holds only Blue rows; ours also holds the rows
 * our own classes declare with `meta.map*`, and `blue` says which a row is
 * (`be` is `meta` plus Blue, decorator-upgrade.md § 6.8).
 *
 * Carbon: Be::VarEntry (blueexposure/include/BlueTypes.h:321-375)
 */
export class VarEntry
{

  static className = "VarEntry";

  /** `mName`: the exposed name. */
  name = "";

  /** `mType`: Carbon's `VARTYPE` name for the member's storage. */
  type = "";

  /** Ours: the JavaScript property key that holds the value, in place of `mOffset` and `mSize`. */
  key = "";

  /** `mIID`: the interface or class a reference member holds, by registered name, or null. */
  iid = null;

  /** `mDescription`: Carbon's doc string. Ours live in JSDoc, so it is empty unless an editor annotation gives one. */
  description = "";

  /** `mEditFlags`: `Be::EDITFLAGS` bits. */
  editFlags = 0;

  /** `mChooserTable`: `[name, value, description]` rows, or null. */
  chooserTable = null;

  /** `mGetProperty`: the property's getter, or null for an attribute. */
  getProperty = null;

  /** `mSetProperty`: the property's setter, or null for an attribute or a read-only property. */
  setProperty = null;

  /** Ours: whether the row is in Blue's view: false only for our own `meta.map*` rows (`exposure.origin: "ours"`). */
  blue = false;

}

CjsSchema.meta.carbon("VarEntry")(VarEntry);
