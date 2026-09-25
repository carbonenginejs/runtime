# Video class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource/video`
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for the video player's metadata, frame and decoder-boundary classes ported from Carbon's videoplayer module.

Carbon decodes video with vendored libraries (libvpx through `VpxDecoder`,
nestegg through `WebMParser`, Vorbis through `VorbisDecoder`), none of which is
Carbon-authored and none of which a browser can link. The interfaces below are
the boundary those decoders sit behind, so a browser decoder can take their
place; the classes carrying frames and metadata are ported as they are.

<!-- class:AudioMetadata -->
## `AudioMetadata`

`AudioMetadata` - what a container parser reports about the audio track.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/AudioMetadata.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IAudioSink -->
## `IAudioSink`

`IAudioSink` - consumes decoded PCM frames and reports playback time.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IAudioSink.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IEncodedFrame -->
## `IEncodedFrame`

`IEncodedFrame` - one encoded frame from a container parser.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IEncodedFrame.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IVideoContainerParser -->
## `IVideoContainerParser`

`IVideoContainerParser` - reads a container and feeds the encoded queues.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IVideoContainerParser.js`
- Visibility: Public
- Kind: Carbon

<!-- class:IVideoDecoder -->
## `IVideoDecoder`

`IVideoDecoder` - decodes encoded video frames into VideoFrames.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IVideoDecoder.js`
- Visibility: Public
- Kind: Carbon

<!-- class:PcmFrame -->
## `PcmFrame`

`PcmFrame` - decoded interleaved PCM an audio sink consumes.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/PcmFrame.js`
- Visibility: Public
- Kind: Carbon

<!-- class:VideoFrame -->
## `VideoFrame`

`VideoFrame` - a decoded frame, its timestamp, and its average colour.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/VideoFrame.js`
- Visibility: Public
- Kind: Carbon

<!-- class:VideoMetadata -->
## `VideoMetadata`

`VideoMetadata` - what a container parser reports about the video track.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/VideoMetadata.js`
- Visibility: Public
- Kind: Carbon
