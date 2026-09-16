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

/** `StreamType` (Metadata.h:255-260), a bitfield: audio 1, video 2, both 3. */
export const StreamType = Object.freeze({
  STREAM_AUDIO: 1,
  STREAM_VIDEO: 2,
  STREAM_AUDIO_VIDEO: 3
});
