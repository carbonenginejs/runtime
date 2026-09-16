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

What a container parser reports about an audio track: codec, channels, bits per sample, sample rate, and the codec's setup bytes, whose owning record Carbon nests and this port flattens to one typed array.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/AudioMetadata.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IAudioSink -->
## `IAudioSink`

Where decoded PCM goes, and the clock video follows when audio is present, leaving the concrete sink to whoever owns audio output.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IAudioSink.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IEncodedFrame -->
## `IEncodedFrame`

One encoded audio or video packet as a container parser emits it, returning its bytes directly where Carbon uses out-parameters.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IEncodedFrame.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IVideoContainerParser -->
## `IVideoContainerParser`

The boundary a container reader sits behind: track metadata, duration and download progress, seeking, and the encoded queues its decoders drain.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IVideoContainerParser.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:IVideoDecoder -->
## `IVideoDecoder`

The boundary a video decoder sits behind: the queue it publishes decoded frames to, the time before which undecoded frames may be dropped, and its error state.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/IVideoDecoder.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:PcmFrame -->
## `PcmFrame`

One decoded audio frame with its presentation time and interleaved samples, held in a typed array where Carbon allocates them immediately after the struct.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/PcmFrame.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:VideoFrame -->
## `VideoFrame`

One decoded frame with its size, presentation time, four-byte-per-pixel BGRA bytes and average colour, which the player pushes into a texture and onto its average-colour field.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/VideoFrame.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:VideoMetadata -->
## `VideoMetadata`

What a container parser reports about a video track: codec, frame size, and whether it carries alpha.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/video/VideoMetadata.js`
- Visibility: Public
- Kind: Faithful Carbon port
