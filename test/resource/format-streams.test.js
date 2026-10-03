import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CjsFormat } from "../../src/resource/format/CjsFormat.js";
import { StreamType } from "../../src/global/consts/media/metadata.js";
import { blueEnums, CJS_ENUM_NAME } from "../../src/global/blue/enums/CjsBlueEnumRegistry.js";
import { StreamType as VideoStreamType } from "../../src/resource/video/enums.js";
import { CjsMp4Format } from "../../src/resource/formats/mp4/CjsMp4Format.js";
import { CjsWebmFormat } from "../../src/resource/formats/webm/CjsWebmFormat.js";
import { CjsOggFormat } from "../../src/resource/formats/ogg/CjsOggFormat.js";
import { CjsWavFormat } from "../../src/resource/formats/wav/CjsWavFormat.js";
import { CjsResource } from "../../npm/dist/global/blue/CjsResource.js";
import { CjsBlueResMan } from "../../npm/dist/global/blue/CjsBlueResMan.js";

const { STREAM_AUDIO, STREAM_VIDEO, STREAM_AUDIO_VIDEO } = StreamType;

test("format stream declarations reuse Carbon flags and derive both checks", () => {
  assert.equal(StreamType, VideoStreamType);
  assert.equal(blueEnums.Get("videoplayer.StreamType"), StreamType);
  assert.equal(StreamType[CJS_ENUM_NAME], "videoplayer.StreamType");
  assert.equal(Object.getOwnPropertyDescriptor(StreamType, CJS_ENUM_NAME).enumerable, false);
  assert.deepEqual(Object.values(StreamType), [1, 2, 3]);
  assert.equal(STREAM_AUDIO | STREAM_VIDEO, STREAM_AUDIO_VIDEO);
  for (const Format of [CjsMp4Format, CjsWebmFormat, CjsOggFormat]) {
    const raw = Format.outputs.raw;
    assert.equal(raw.outputStreams, STREAM_AUDIO_VIDEO);
    assert.equal(raw.hasVideo, true);
    assert.equal(raw.hasAudio, true);
  }
  assert.equal(CjsWavFormat.outputs.pcm.outputStreams, STREAM_AUDIO);
  assert.equal(CjsWavFormat.outputs.pcm.hasVideo, false);
  assert.equal(CjsWavFormat.outputs.pcm.hasAudio, true);
  assert.equal(CjsMp4Format.outputs.mp4Json.outputStreams, 0);
  assert.equal(CjsMp4Format.outputs.mp4Json.hasVideo, false);
  for (const outputStreams of [-1, 4, 1.5, "video", true, NaN]) {
    assert.throws(() => CjsFormat.defineOutputs({ packet: { default: true, outputStreams } }), /StreamType/);
  }
  const output = CjsFormat.defineOutputs({ packet: { default: true, outputStreams: STREAM_AUDIO } }).packet;
  output.outputStreams = STREAM_VIDEO;
  assert.equal(output.hasVideo, true);
  assert.equal(output.hasAudio, false, "checks cannot drift from the shared mask");
});

class AudioFormat extends CjsFormat {
  static className = "AudioFormat";
  static id = "AudioFormat";
  static extensions = [".streams"];
  static outputs = CjsFormat.defineOutputs({ packet: { default: true, outputStreams: STREAM_AUDIO }, inspect: {} });
  static is() { return true; }
  static read(_bytes, options) { return { format: this.id, outputStreams: options.outputStreams }; }
}
class VideoFormat extends AudioFormat {
  static className = "VideoFormat";
  static id = "VideoFormat";
  static read(bytes, options) { return super.read(bytes, options); }
  static outputs = CjsFormat.defineOutputs({ packet: { default: true, outputStreams: STREAM_VIDEO } });
}
class BothFormat extends AudioFormat {
  static className = "BothFormat";
  static id = "BothFormat";
  static read(bytes, options) { return super.read(bytes, options); }
  static outputs = CjsFormat.defineOutputs({ packet: { default: true, outputStreams: STREAM_AUDIO_VIDEO } });
}

test("ResMan selects declared stream flags and separates cached outcomes", async () => {
  const manager = new CjsBlueResMan({ source: { Read: () => new Uint8Array([1]) } });
  for (const Format of [AudioFormat, VideoFormat, BothFormat]) manager.RegisterFormat(Format);
  manager.RegisterExtension("streams", CjsResource, { Formats: [AudioFormat, VideoFormat, BothFormat] });
  for (const [outputStreams, format] of [[STREAM_AUDIO,"AudioFormat"],[STREAM_VIDEO,"VideoFormat"],[STREAM_AUDIO_VIDEO,"BothFormat"]]) {
    const resource = manager.GetResource("res:/sample.streams", { outputStreams });
    await resource.Ready();
    const result = resource.GetPayload();
    assert.equal(result.format, format);
    assert.equal(result.outputStreams, undefined, "routing flags do not leak into decoder options");
  }
  const resource = manager.GetResource("res:/sample.streams", { formatOptions: { outputStreams: STREAM_VIDEO } });
  await resource.Ready();
  const video = resource.GetPayload();
  assert.equal(video.format, "VideoFormat", "nested stream request uses the same Carbon flags");
  assert.throws(() => manager.ResolveFormatDescriptor("streams", { emit: "inspect", outputStreams: STREAM_VIDEO }), /output|format/i);
  assert.throws(() => manager.GetResourceVariant({ outputStreams: 4 }), /StreamType/);
  assert.equal(manager.GetResourceVariant({ outputStreams: STREAM_VIDEO, variant: "pinned" }), "pinned");
  assert.notEqual(manager.GetResourceVariant({outputStreams:STREAM_AUDIO}), manager.GetResourceVariant({outputStreams:STREAM_VIDEO}));
  manager.Clear();
});

test("ResMan consumes stream requests before real Ogg probes and decoders", async () => {
  const bytes = readFileSync(new URL("./runtime-resource/fixtures/ogg/sine-440.ogg", import.meta.url));
  for (const ordered of [false, true]) {
    const manager = new CjsBlueResMan({ source: { Read: () => bytes } });
    manager.RegisterFormat(CjsOggFormat);
    if (ordered) manager.RegisterExtension("ogg", CjsResource, { Formats: [CjsOggFormat] });
    try {
      for (const request of [{ outputStreams: STREAM_AUDIO }, { formatOptions: { outputStreams: STREAM_AUDIO } }]) {
        const resource = manager.GetResource(`res:/fixture-${Object.keys(request)[0]}.ogg`, { ...request, emit: "raw" });
        await resource.Ready();
        const payload = resource.GetPayload();
        assert.equal(payload.mimeType, "audio/ogg");
        assert.equal(payload.metadata.outputStreams, STREAM_AUDIO);
        assert.equal(payload.metadata.tracks[0].streamType, STREAM_AUDIO);
      }
      const pcm = manager.GetResource("res:/fixture-pcm.ogg", { emit: "pcm", outputStreams: STREAM_AUDIO });
      await pcm.Ready();
      assert.ok(pcm.GetPayload().data.length > 0);
      assert.throws(() => manager.ResolveFormatDescriptor("ogg", { emit: "pcm", outputStreams: STREAM_VIDEO }), /output|format/i);
    } finally {
      manager.Clear();
    }
  }
});
