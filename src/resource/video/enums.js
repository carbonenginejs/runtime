// Source: videoplayer/Metadata.h
//
// The file-scope enums of Carbon's video player. The two `Codec` enums are
// nested in their metadata structs (`VideoMetadata::Codec`,
// `AudioMetadata::Codec`) and stay there, as statics on those classes: one
// module cannot hold two exports called `Codec`, and renaming either would
// lose the Carbon spelling.

/** `ParserError` (Metadata.h:242-247). */
export const ParserError = Object.freeze({
  PARSER_ERROR_OK: 0,
  PARSER_ERROR_INVALID_STREAM: 1,
  PARSER_ERROR_INVALID_DATA: 2
});

/** `DecoderError` (Metadata.h:249-253). */
export const DecoderError = Object.freeze({
  DECODER_ERROR_OK: 0,
  DECODER_ERROR_UNSUPPORTED_CODEC: 1
});

// The shared declaration also serves standalone format readers and Blue requests.
export { StreamType } from "#consts/media";

/** VideoController::State (VideoController.h:35-53), exposed as videoplayer.State. */
export const State = Object.freeze({
  UNINITIALIZED: 0,
  PARSING_METADATA: 1,
  INITIAL_BUFFERING: 2,
  PLAYING: 3,
  BUFFERING: 4,
  FINISHING_BUFFERING: 5,
  DONE: 6
});
