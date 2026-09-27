// Source: blue/src/YamlWriter.h
// Source: blue/src/YamlWriter.cpp
//
// NOT YET PORTED. YamlWriter writes an object tree as YAML text, which is how
// Carbon writes `.red` files: `type` first, the object's `__bluemetadata__`,
// then the members, with an anchor retrofitted onto an object the second time
// it is reached (YamlWriter.cpp:322-376). Those rules already run in
// `DictWriter`, modelled on this class, which emits a plain object instead of
// YAML events. Writing `.red` (authoring tools, which carry metadata) is what
// this class is for; until then its entry points throw.
import { CjsSchema, impl } from "#schema";
import { IRootWriter } from "./IRootWriter.js";

/** `YamlWriter` - writes an object tree as YAML (`.red`); not yet implemented. */
export class YamlWriter extends IRootWriter
{
  /**
   * Writes `root` to a stream as YAML (YamlWriter.h:25).
   *
   * @throws {Error} Always, until the writer is ported.
   */
  WriteObjectToStream(_root, _stream)
  {
    throw new Error("YamlWriter.WriteObjectToStream is not implemented in CarbonEngineJS.");
  }

  /**
   * Writes `root` to a YAML string (YamlWriter.h:26).
   *
   * @throws {Error} Always, until the writer is ported.
   */
  WriteObjectToString(_root)
  {
    throw new Error("YamlWriter.WriteObjectToString is not implemented in CarbonEngineJS.");
  }
}

CjsSchema.define(YamlWriter, { className: "YamlWriter", carbon: "YamlWriter", family: "blue", fields: {} });
CjsSchema.decorateMethod(YamlWriter, "WriteObjectToStream", impl.notImplemented);
CjsSchema.decorateMethod(YamlWriter, "WriteObjectToString", impl.notImplemented);
