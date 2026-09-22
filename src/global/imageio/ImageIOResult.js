// Source: imageio/include/ImageIOResult.h
// Source: imageio/ImageIOResult.cpp
//
// `ImageIO::Result`: what every image handler returns - a code, and an
// optional message formatted at the failure site. Carbon names the struct
// `Result` inside the ImageIO namespace; JavaScript has no namespace to put it
// in, so the class carries the header's name.

import { CjsSchema } from "#schema";


/** `ImageIO::Result` - an image operation's outcome. */
export class ImageIOResult
{

  /** `ImageIO::Result::Code` (ImageIOResult.h:10-27). */
  static Code = {
    OK: 0,
    UNRECOGNIZED_IMAGE_TYPE: 1,
    METHOD_NOT_SUPPORTED: 2,
    READ_FAILURE: 3,
    WRITE_FAILURE: 4,
    INVALID_HEADER: 5,
    HEADER_NOT_SUPPORTED: 6,
    INVALID_DATA: 7,
    ERROR_CREATING_BITMAP: 8,
    INVALID_BITMAP: 9,
    SAVE_NOT_SUPPORTED: 10,
    OUT_OF_MEMORY: 11,
    ERROR_CONVERTING_FORMAT: 12,
    ERROR_INITIALIZING_EXTERNAL_LIBRARY: 13,
    UNKNOWN_FAILURE: 14
  };

  /** code - a `Code` value. */
  code = Code.OK;

  /** message - optional detail formatted at the failure site. */
  message = "";

  /**
   * adapted: Carbon's printf-style constructor and `FormatVAList` collapse -
   * a JavaScript caller formats the message with a template string.
   *
   * @param {number} [code] A `Code` value.
   * @param {string} [message] Detail.
   */
  constructor(code = Code.OK, message = "")
  {
    this.code = code;
    this.message = message;
  }

  /**
   * Whether the operation succeeded.
   *
   * adapted: Carbon's `operator bool` (ImageIOResult.h:43-46), which
   * JavaScript cannot overload.
   *
   * @returns {boolean} Whether the code is OK.
   */
  IsOk()
  {
    return this.code === Code.OK;
  }

  /**
   * The fixed text for the code, with the message appended (ImageIOResult.cpp:73-81).
   *
   * @returns {string} Error text.
   */
  GetErrorMessage()
  {
    const text = MESSAGES[this.code] ?? "unknown failure";

    return this.message ? `${text}: ${this.message}` : text;
  }

}


// A call, not a decorator: see BitmapDimensions.js.
CjsSchema.define(ImageIOResult, { className: "ImageIOResult", carbon: "Result" });


const Code = ImageIOResult.Code;
/** The fixed text per code (ImageIOResult.cpp:9-45). */
const MESSAGES = {
  [Code.OK]: "operation completed successfully",
  [Code.UNRECOGNIZED_IMAGE_TYPE]: "unrecognized image type",
  [Code.METHOD_NOT_SUPPORTED]: "method not supported for this image type",
  [Code.READ_FAILURE]: "error reading from stream",
  [Code.WRITE_FAILURE]: "error writing to stream",
  [Code.INVALID_HEADER]: "invalid image header",
  [Code.HEADER_NOT_SUPPORTED]: "image header not supported",
  [Code.INVALID_DATA]: "invalid data in input stream",
  [Code.ERROR_CREATING_BITMAP]: "error creating host bitmap",
  [Code.INVALID_BITMAP]: "invalid bitmap passed for saving",
  [Code.SAVE_NOT_SUPPORTED]: "saving of this bitmap is not supported",
  [Code.OUT_OF_MEMORY]: "out of memory",
  [Code.ERROR_CONVERTING_FORMAT]: "error converting pixel format",
  [Code.ERROR_INITIALIZING_EXTERNAL_LIBRARY]: "error initializing external library"
};
