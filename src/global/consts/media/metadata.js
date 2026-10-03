// Source: videoplayer/Metadata.h (StreamType)
import { blueEnums } from "../../blue/enums/CjsBlueEnumRegistry.js";
/** Carbon videoplayer/Metadata.h:255-260; one stream mask shared by requests and format outputs. */
export const StreamType = {
    STREAM_AUDIO: 1,
    STREAM_VIDEO: 2,
    STREAM_AUDIO_VIDEO: 3
};

// Carbon declares no chooser or exposure for this file-scope enum.
blueEnums.Create("videoplayer.StreamType", StreamType, {
    source: "videoplayer/Metadata.h", family: "videoplayer", line: 255
});
