import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AudioMetadata,
  DecoderError,
  IAudioSink,
  IEncodedFrame,
  IVideoContainerParser,
  IVideoDecoder,
  ParserError,
  PcmFrame,
  StreamType,
  VideoFrame,
  VideoMetadata
} from "../../../src/resource/index.js";

test("the video enums carry Carbon's members and values", () =>
{
  // Metadata.h:242-260. Implicit C++ enumerators, so 0-based and in declaration
  // order; StreamType is a bitfield and says so.
  assert.deepEqual({ ...ParserError }, {
    PARSER_ERROR_OK: 0,
    PARSER_ERROR_INVALID_STREAM: 1,
    PARSER_ERROR_INVALID_DATA: 2
  });
  assert.deepEqual({ ...DecoderError }, {
    DECODER_ERROR_OK: 0,
    DECODER_ERROR_UNSUPPORTED_CODEC: 1
  });
  assert.deepEqual({ ...StreamType }, {
    STREAM_AUDIO: 1,
    STREAM_VIDEO: 2,
    STREAM_AUDIO_VIDEO: 3
  });
  assert.equal(StreamType.STREAM_AUDIO | StreamType.STREAM_VIDEO, StreamType.STREAM_AUDIO_VIDEO);
  // The two nested Codec enums keep Carbon's spelling by staying on their class.
  assert.deepEqual({ ...VideoMetadata.Codec }, { OTHER: 0, VP8: 1, VP9: 2 });
  assert.deepEqual({ ...AudioMetadata.Codec }, { OTHER: 0, VORBIS: 1 });
});

test("metadata defaults match Carbon's defaulted constructors", () =>
{
  const video = new VideoMetadata();
  assert.equal(video.codec, VideoMetadata.Codec.OTHER);
  assert.deepEqual([ video.width, video.height, video.hasAlpha ], [ 0, 0, false ]);
  const described = new VideoMetadata(VideoMetadata.Codec.VP9, 1920, 1080, true);
  assert.deepEqual(
    [ described.codec, described.width, described.height, described.hasAlpha ],
    [ VideoMetadata.Codec.VP9, 1920, 1080, true ]
  );

  const audio = new AudioMetadata();
  assert.equal(audio.codec, AudioMetadata.Codec.OTHER);
  assert.deepEqual([ audio.channels, audio.bps, audio.rate ], [ 0, 0, 0 ]);
  // Carbon's nested CodecInitializationData is flattened to the bytes themselves.
  assert.equal(audio.codecInitializationData, null);
  const vorbis = new AudioMetadata(AudioMetadata.Codec.VORBIS, 2, 16, 48000, new Uint8Array([ 1, 2 ]));
  assert.equal(vorbis.codecInitializationData.length, 2);
});

test("frames carry their pixels and samples in typed arrays", () =>
{
  const frame = new VideoFrame(4, 2, 1234, new Uint8Array(4 * 2 * 4));
  assert.deepEqual([ frame.width, frame.height, frame.timeStamp ], [ 4, 2, 1234 ]);
  // Four bytes per pixel, as VideoPlayer::Update's pitch says (4 * width).
  assert.equal(frame.bgra.length, frame.width * frame.height * 4);
  assert.deepEqual(frame.averageColor, { red: 0, green: 0, blue: 0, alpha: 0 });

  const pcm = new PcmFrame(99, 512, 2, new Int16Array(512 * 2));
  assert.deepEqual([ pcm.timeStamp, pcm.samples, pcm.channels ], [ 99, 512, 2 ]);
  assert.equal(pcm.data.length, pcm.samples * pcm.channels);

  assert.equal(new VideoFrame().bgra, null);
  assert.equal(new PcmFrame().data, null);
});

test("every decoder-boundary method refuses until an implementation supplies it", () =>
{
  const surfaces = [
    [ new IVideoDecoder(), [ "GetDecodedQueue", "SetDropFrameTime", "GetError" ] ],
    [ new IVideoContainerParser(), [
      "IsMetadataAvailable", "GetVideoMetadata", "GetAudioMetadata", "CompleteQueues",
      "GetDuration", "GetDownloadedMediaTime", "Seek", "GetAudioQueue", "GetVideoQueue", "GetError"
    ] ],
    [ new IAudioSink(), [ "Open", "Close", "Pause", "Resume", "GetTime", "IsDone" ] ],
    [ new IEncodedFrame(), [
      "GetFrameCount", "GetTimeStamp", "IsSeekFrame", "GetFrame", "GetAlphaFrame", "IsSkipFrame"
    ] ]
  ];
  for (const [ instance, methods ] of surfaces)
  {
    for (const method of methods)
    {
      assert.throws(() => instance[method](), new RegExp(`${method} must be implemented`, "u"));
    }
  }
});
