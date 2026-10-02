// Host policy: SOF plane usages 2 and 3 name these dynamic video playlists.
// The browser host injects VideoPlayer; headless consumers retain a black placeholder.
const videos = Object.freeze([
  "res:/video/billboards/common/matigu_sushi.webm",
  "res:/video/billboards/common/2036671_fun_inc.webm",
  "res:/video/billboards/common/2036674_dark_venture_corporation.webm",
  "res:/video/billboards/common/eve_shipad_astero_timeless.webm",
  "res:/video/billboards/common/eve_shipad_dominix_timeless.webm"
]);

export const DEMO_VIDEO_PLAYLISTS = Object.freeze({
  inspacevideos: videos,
  hangarvideos: videos
});
