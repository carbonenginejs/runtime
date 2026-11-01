// Source: blue/src/IRootReader.h
//
// The reader as a stream's CALLER sees it: read an object tree from a stream.
// Carbon's YamlReader and BlackReader implement it; DictReader does not (it
// reads a dictionary, through IRootReaderBase). Our stream readers are the
// formats (CjsBlackFormat, the yaml format), which do not implement it yet.
import { CjsSchema, meta } from "#schema";
import { IRoot } from "../blueexposure/IRoot.js";

/** `IRootReader` - reads an object tree from a stream, per blue/src/IRootReader.h:15-25. */
export class IRootReader extends IRoot
{
  /**
   * `ReadFromStream` - reads the stream's root object, or null on failure.
   *
   * @abstract
   */
  ReadFromStream(_stream) {}

  /**
   * `ReadForCachingFromStream` - reads the stream for caching; returns whether it succeeded.
   *
   * @abstract
   */
  ReadForCachingFromStream(_stream) {}

  /**
   * `SetFileName` - the file name reported in errors.
   *
   * @abstract
   */
  SetFileName(_name) {}

  /**
   * `SetDoInitialize` - whether read objects are initialized.
   *
   * @abstract
   */
  SetDoInitialize(_doInitialize) {}

  /**
   * `SetTimeSlice` - the time a read may take per step.
   *
   * @abstract
   */
  SetTimeSlice(_seconds) {}

  /**
   * `GetErrorMessage` - why the last `ReadFromStream` returned null.
   *
   * @abstract
   */
  GetErrorMessage() {}
}

for (const method of [ "ReadFromStream", "ReadForCachingFromStream", "SetFileName", "SetDoInitialize", "SetTimeSlice", "GetErrorMessage" ])
{
  CjsSchema.decorateMethod(IRootReader, method, meta.abstract);
}

CjsSchema.exposure.inherit(IRoot)(IRootReader);
CjsSchema.exposure.interface("IRootReader")(IRootReader);
