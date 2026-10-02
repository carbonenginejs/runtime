// Source: blue/include/IBlueObjectMetadata.h
//
// Data about an object that is not one of its members: per object, string keys
// to string values. `BeObjectMetadata` is the store; DictReader reads a bag's
// `__bluemetadata__` dictionary into it, and a writer writes it back out.
import { CjsSchema, meta } from "#schema";

/** `BLUE_OBJECT_METADATA_KEY` (IBlueObjectMetadata.h:5): the reserved key a dictionary carries metadata under. */
export const BLUE_OBJECT_METADATA_KEY = "__bluemetadata__";

/** `IBlueObjectMetadata` - per-object string metadata, per blue/include/IBlueObjectMetadata.h. */
export class IBlueObjectMetadata
{
  /** `GetMetadata` - the object's key/value table, or null when it has none. */
  GetMetadata(_owner) {}

  /** `Set` - sets one key on the object. */
  Set(_owner, _key, _value) {}

  /** `Get` - one key's value, or `defaultValue` when absent. */
  Get(_owner, _key, _defaultValue) {}

  /** `Delete` - removes one key. */
  Delete(_owner, _key) {}

  /** `DeleteObject` - removes every key the object has. */
  DeleteObject(_owner) {}

  /** `CopyShallow` - copies the source object's keys onto the target. */
  CopyShallow(_source, _target) {}

  /** `CopyDeep` - copies metadata across an object graph. */
  CopyDeep(_source, _target) {}
}

for (const method of [ "GetMetadata", "Set", "Get", "Delete", "DeleteObject", "CopyShallow", "CopyDeep" ])
{
  CjsSchema.decorateMethod(IBlueObjectMetadata, method, meta.requires, meta.abstract);
}

CjsSchema.define(IBlueObjectMetadata, { className: "IBlueObjectMetadata", carbon: "IBlueObjectMetadata", family: "blue", fields: {} });
