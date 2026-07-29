// runtime-audio demo — real library, synthesized fallback, no Trinity.
//
// Class-based demo application. Each class owns one concern:
//   AudioLibrary     the audio artifact + event/effect naming queries
//   MediaSource      wem fetch/decode, synthesized stand-ins, media stats
//   Scene            listener + emitter population and lifecycle sequences
//   Stage            canvas view, pointer interaction, hover card, drawing
//   MusicUi          dynamic-music chips, play/stop, one-line status hud
//   Showcase         the prebuilt "Load demo" scene and its schedulers
//   EffectListPanel  the searchable effect list on the left
//   DemoApp          wiring, audio-system enablement, the frame loop

import { CjsAudioSystem, AudEmitter, AudListener, AudMusicPlayer } from "/runtime-audio/npm/dist/index.js";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

// One acoustic scale everywhere: world units -> panner units.
const ACOUSTIC_SCALE = 1 / 150;
// Inverse-distance gain floor that still reads as audible in practice.
const AUDIBLE_GAIN_FLOOR = 0.05;

// EVE names events <stem>_<stage>. Dominant family: play(loop)+stop; state
// machines add on/off/idle/active/activate/deactivate/fire/powerdown/etc.
const STAGE_PATTERN = /^(.+)_(on|off|idle|active|activate|deactivate|fire|begin|end|start|powerdown|play|stop|pause|resume)$/i;

// Stage display names: Proper Case, underscores to spaces, structural
// suffixes (_play/_event) clipped. Visual tool only - the panel list keeps
// raw event names.
function PrettyName(name)
{
    return String(name ?? "")
        .replace(/_(play|event)$/i, "")
        .split("_")
        .map(word => /^(xs|xxs|s|m|l|xl|xxl)$/i.test(word) ? word.toUpperCase() : word ? word[0].toUpperCase() + word.slice(1) : word)
        .join(" ");
}

// FNV-1a: a stable per-event identity for media picks and synth parameters.
function HashName(text)
{
    let h = 2166136261;
    for (const c of text)
    {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}


/**
 * The audio artifact plus every naming/graph query the demo asks of it:
 * event records, playable media edges, and the effect/stage grouping the
 * list panel and lifecycle sequences are built from.
 */
class AudioLibrary
{

    /** The raw library artifact (metadata, media tables, music graph) */
    raw = null;

    /** Every event name in the library */
    eventNames = [];

    /** Effect stem -> (stage -> event name) */
    effects = new Map();

    /** Every effect stem, in library order */
    effectStems = [];

    constructor(raw)
    {
        if (raw.schema !== "carbonenginejs.audioLibrary" || raw.schemaVersion !== 2)
        {
            throw new Error(`Unsupported audio library schema: ${raw.schema ?? "<missing>"} v${raw.schemaVersion ?? "<missing>"}`);
        }

        this.raw = raw;
        this.eventNames = Object.keys(raw.metadata.Events);
        for (const name of this.eventNames)
        {
            const match = name.match(STAGE_PATTERN);
            const stem = match ? match[1] : name;
            const stage = match ? match[2].toLowerCase() : "event";
            (this.effects.get(stem) ?? this.effects.set(stem, new Map()).get(stem)).set(stage, name);
        }
        this.effectStems = [ ...this.effects.keys() ];
    }

    /**
     * One artifact for all audio. Prefer the library selected by the demo
     * server, then fall back to the committed base-metadata demo copy so a
     * fresh clone or another static server still works.
     */
    static async Load()
    {
        const raw = await FetchLibraryJson("/audio-library.json.gz")
            ?? await FetchLibraryJson("/audio-library.json")
            ?? await FetchLibraryJson(new URL("./audio-library.json.gz", import.meta.url))
            ?? await FetchLibraryJson(new URL("./audio-library.json", import.meta.url));

        if (!raw)
        {
            throw new Error("No generated audio library artifact is available");
        }

        return new AudioLibrary(raw);
    }

    get metadata()
    {
        return this.raw.metadata;
    }

    /**
     * Dynamic-music graph: the library's tools-generated `music` section.
     */
    get music()
    {
        return this.raw.music ?? null;
    }

    GetEventRecord(eventName)
    {
        return this.raw.metadata.Events[eventName];
    }

    /**
     * Exact event->wem edges (HIRC graph) are the ONLY media route: every
     * event with a reachable play chain in the shipped banks has edges.
     * Events without them are control events (stop/pause - their actions
     * target other events) or reference unshipped objects; the real client
     * plays nothing for those.
     */
    PlayableCandidates(eventName)
    {
        return (this.raw.eventMedia?.[eventName] ?? []).filter(wemId => this.WemUrl(wemId));
    }

    /**
     * A wem is reachable when it's streamed (media table -> /cache) or
     * embedded in a bank's DATA payload (embeddedMedia -> server-side
     * /bankwem slice).
     */
    WemUrl(wemId)
    {
        const media = this.SelectVariant(this.raw.media[wemId]);
        if (media) return `/cache/${media.storagePath}`;
        const embedded = this.SelectVariant(this.raw.embeddedMedia?.[wemId]);
        // mediaType is catalog-time typing (kb §5): only wem entries are
        // playable audio; MIDI clips and plugin blobs are music-system data.
        if (embedded && (!embedded.mediaType || embedded.mediaType === "wem")) return `/bankwem/${wemId}`;
        return null;
    }

    /** Select the source matching the language used to build eventMedia. */
    SelectVariant(value)
    {
        if (!Array.isArray(value)) return value ?? null;
        const language = this.raw.eventMediaLanguage ?? "";
        return value.find(record => record.language === language)
            ?? value.find(record => !record.language)
            ?? value[0]
            ?? null;
    }

    /**
     * Automatic sequence: lifecycle order, returning to idle after active,
     * then the wind-down stages. Pause/resume are excluded (manual only).
     */
    SequenceFor(stages)
    {
        const sequence = [];
        for (const stage of [ "on", "activate", "begin", "start" ]) if (stages.has(stage)) sequence.push(stage);
        if (stages.has("idle")) sequence.push("idle");
        if (stages.has("active"))
        {
            sequence.push("active");
            if (stages.has("idle")) sequence.push("idle");
        }
        for (const stage of [ "fire", "play", "event" ]) if (stages.has(stage)) sequence.push(stage);
        for (const stage of [ "end", "powerdown", "deactivate", "stop", "off" ]) if (stages.has(stage)) sequence.push(stage);
        return sequence.length ? sequence : [ ...stages.keys() ].slice(0, 1);
    }

    /** Aggregate display facts across an effect's stages */
    GetEffectMeta(stages)
    {
        let radius = 0,
            anyLoop = false,
            anyPlayable = false;
        for (const name of stages.values())
        {
            const record = this.GetEventRecord(name);
            radius = Math.max(radius, record?.maxRadiusAttenuation ?? 0);
            anyLoop = anyLoop || !!record?.isLoop;
            anyPlayable = anyPlayable || this.PlayableCandidates(name).length > 0;
        }
        return { radius, anyLoop, anyPlayable };
    }

}

async function FetchLibraryJson(url)
{
    const response = await fetch(url).catch(() => null);

    if (!response?.ok)
    {
        return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b)
    {
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    if (typeof DecompressionStream !== "function")
    {
        throw new Error("This browser cannot decode generated gzip library assets");
    }

    const stream = new Blob([ bytes ])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));

    return new Response(stream).json();
}


/**
 * Media for the audio system: real wems fetched and decoded through the
 * kb §5 resolveType seam, synthesized stand-ins when decode fails, honest
 * silence when the event has no shipped media. Keeps the real/synth/silent
 * tallies the hud displays.
 */
class MediaSource
{

    /** Media outcome tallies for the hud */
    stats = { real: 0, synth: 0, silent: 0 };

    /** @type {AudioLibrary} */
    #library = null;

    /** Decoded AudioBuffers by wem id */
    #cache = new Map();

    /** @type {AudioContext} */
    #context = null;

    constructor(library)
    {
        this.#library = library;
    }

    /** The audio system's createContext callback (keeps the decode ref) */
    CreateContext()
    {
        return this.#context = new AudioContext();
    }

    ResumeContext()
    {
        this.#context?.resume?.();
    }

    /**
     * The audio system's loadBuffer callback. No exact edges -> silence,
     * matching the real client (control events and events whose target
     * objects are not in any shipped bank).
     */
    async LoadEventBuffer(eventName)
    {
        if (!this.#library.PlayableCandidates(eventName).length)
        {
            this.stats.silent++;
            return null;
        }
        try
        {
            const real = await this.#LoadRealBuffer(eventName);
            if (real)
            {
                this.stats.real++;
                return real;
            }
        }
        catch
        {
            // undecodable codec / fetch miss -> synthesized fallback
        }
        this.stats.synth++;
        return this.#Synthesize(eventName);
    }

    /** The music engine loads complete decoded buffers by wem id */
    async LoadMediaBuffer(sourceId)
    {
        const url = this.#library.WemUrl(sourceId);
        if (!url) return null;
        if (this.#cache.has(sourceId)) return this.#cache.get(sourceId);
        const wemBytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const buffer = await this.#DecodeWem(wemBytes);
        this.#cache.set(sourceId, buffer);
        return buffer;
    }

    async #LoadRealBuffer(eventName)
    {
        const candidates = this.#library.PlayableCandidates(eventName);
        if (!candidates.length) return null;
        const wemId = candidates[HashName(eventName) % candidates.length];
        const url = this.#library.WemUrl(wemId);
        if (!url) return null;
        if (this.#cache.has(wemId)) return this.#cache.get(wemId);
        const wemBytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const buffer = await this.#DecodeWem(wemBytes);
        this.#cache.set(wemId, buffer);
        return buffer;
    }

    /**
     * Content-verified routing via the kb §5 resolveType seam: the declared
     * codec is validated against the container structure (mislabeled tags
     * fall through to whichever codec actually validates), and `preferred`
     * names the decode route. The alternate decoder stays as last-resort
     * insurance (a failure here still lands in the caller's synthesized
     * stand-in).
     */
    async #DecodeWem(wemBytes)
    {
        // Wwise Vorbis: lossless repack to Ogg, decoded natively by the browser.
        const asVorbis = async () =>
        {
            const ogg = await CjsWemFormat.toOgg(wemBytes);
            const oggBytes = ogg instanceof Uint8Array ? ogg : ogg.bytes ?? ogg.data;
            return this.#context.decodeAudioData(oggBytes.slice().buffer);
        };
        // PTADPCM / plain PCM (most turret + artillery SFX): decode to
        // float32 channels and build the AudioBuffer directly.
        const asPcm = async () =>
        {
            const pcm = CjsWemFormat.toPcm(wemBytes);
            const built = this.#context.createBuffer(pcm.channels, pcm.sampleCount, pcm.sampleRate);
            pcm.channelData.forEach((data, channel) => built.copyToChannel(data, channel));
            return built;
        };
        const { preferred } = await CjsWemFormat.resolveType(wemBytes);
        const preferPcm = preferred === "pcm";
        try
        {
            return await (preferPcm ? asPcm() : asVorbis());
        }
        catch
        {
            return await (preferPcm ? asVorbis() : asPcm());
        }
    }

    /**
     * Synthesized stand-in: buffer parameters derive from the event's REAL
     * metadata (loop flag) + a name hash for identity.
     */
    #Synthesize(eventName)
    {
        const record = this.#library.GetEventRecord(eventName);
        const seed = HashName(eventName);
        const seconds = record.isLoop ? 1.5 : 0.6 + (seed % 40) / 100;
        const rate = this.#context.sampleRate;
        const buffer = this.#context.createBuffer(1, Math.floor(seconds * rate), rate);
        const data = buffer.getChannelData(0);
        const base = 90 + (seed % 700);
        for (let i = 0; i < data.length; i++)
        {
            const t = i / rate;
            const envelope = record.isLoop ? 0.6 : Math.exp(-3 * t);
            data[i] = envelope * 0.25 * (
                Math.sin(2 * Math.PI * base * t) +
                0.5 * Math.sin(2 * Math.PI * base * 1.5 * t) +
                0.15 * (Math.random() * 2 - 1)
            );
        }
        return buffer;
    }

}


/**
 * The world: the listener and every placed emitter, their spawning rules,
 * lifecycle-sequence advancement, and removal/teardown paths.
 */
class Scene
{

    /** Placed emitter items (the live array shared with window.__demo) */
    emitters = [];

    /** Listener world position (y stays 0) */
    listenerPosition = [ 0, 0, 0 ];

    /** @type {AudListener} */
    listenerObject = null;

    /** Current world-scale factor (emitter x/z multiply from the origin) */
    worldScale = 1;

    /** @type {DemoApp} */
    #app = null;

    constructor(app)
    {
        this.#app = app;
    }

    /**
     * Scales every emitter's x/z from the world origin (page center):
     * positions multiply by the ratio to the previous factor, through the
     * real engine path so culling and panners react. The listener stays
     * where it is; later spawns place themselves normally until the slider
     * moves again.
     */
    SetWorldScale(factor)
    {
        const ratio = factor / (this.worldScale || 1);
        this.worldScale = factor;
        if (ratio === 1) return;
        for (const item of this.emitters)
        {
            this.MoveEmitterTo(item, [ item.position[0] * ratio, 0, item.position[2] * ratio ]);
        }
    }

    MoveListenerTo(world)
    {
        this.listenerPosition[0] = world[0];
        this.listenerPosition[2] = world[2];
        // WebAudio default orientation: forward -Z, up +Y.
        this.listenerObject?.SetPosition([ 0, 0, -1 ], [ 0, 1, 0 ], this.listenerPosition);
        for (const item of this.emitters)
        {
            Scene.SetEmitterPlacement(item.emitter, item.position, this.listenerPosition);
        }
    }

    MoveEmitterTo(item, world)
    {
        item.position[0] = world[0];
        item.position[2] = world[2];
        // Real engine path: stores the graph position, re-culls against it,
        // and pushes the panner placement when the emitter is live.
        Scene.SetEmitterPlacement(item.emitter, item.position, this.listenerPosition);
    }

    /** Faces an emitter toward the listener and applies the public Blue placement API. */
    static SetEmitterPlacement(emitter, position, listenerPosition)
    {
        const x = listenerPosition[0] - position[0],
            z = listenerPosition[2] - position[2],
            length = Math.hypot(x, z);
        const front = length > 1e-6 ? [ x / length, 0, z / length ] : [ 0, 0, 1 ];
        emitter.SetPlacement(front, [ 0, 1, 0 ], position);
    }

    /** One playing event on a fresh emitter; returns the scene item */
    Spawn(eventName, effectStem = null, fixedPosition = null)
    {
        if (!this.#app.system) return;
        const record = this.#app.library.GetEventRecord(eventName);
        const item = this.#SpawnEmitter(Math.max(500, record.maxRadiusAttenuation || 2000), fixedPosition);
        item.eventName = eventName;
        item.effectStem = effectStem;
        item.isLoop = !!record.isLoop;
        item.emitter.SendEvent(eventName);
        this.emitters.push(item);
        return item;
    }

    /**
     * One emitter walking the effect's lifecycle: loops hold then advance,
     * one-shots play out; advancing stops the previous loop through the
     * engine's StopEvent (our backend does not execute Wwise-side stop
     * actions).
     */
    SpawnSequence(stem, fixedPosition = null)
    {
        if (!this.#app.system) return;
        const stages = this.#app.library.effects.get(stem);
        const { radius } = this.#app.library.GetEffectMeta(stages);
        const item = this.#SpawnEmitter(Math.max(500, radius || 2000), fixedPosition);
        item.effectStem = stem;
        item.sequence = this.#app.library.SequenceFor(stages).map(stage => stages.get(stage));
        item.sequenceIndex = -1;
        item.holdUntil = 0;
        item.eventName = `${stem} ▶`;
        this.emitters.push(item);
        return item;
    }

    AdvanceSequences(now)
    {
        const library = this.#app.library;
        for (const item of this.emitters)
        {
            if (!item.sequence || item.sequenceDone) continue;
            if (item.sequenceIndex >= 0)
            {
                if (now < item.holdUntil) continue;
                // Let one-shots play out (capped so a stuck load cannot wedge the run).
                if (!item.currentIsLoop && item.emitter.GetPlayingEvents().size && now < item.holdUntil + 5000) continue;
                if (item.currentIsLoop) item.emitter.StopEvent(item.currentName, 600);
            }
            item.sequenceIndex++;
            if (item.sequenceIndex >= item.sequence.length)
            {
                item.sequenceDone = true;
                continue;
            }
            const name = item.sequence[item.sequenceIndex];
            const record = library.GetEventRecord(name);
            item.currentName = name;
            item.currentIsLoop = !!record?.isLoop;
            item.eventName = name;
            item.emitter.SendEvent(name);
            item.holdUntil = now + (item.currentIsLoop ? 6000 : 400);
        }
    }

    /**
     * One-shot emitters vanish once their sound has finished: nothing
     * playing, nothing queued for wake, no culled one-shot waiting for
     * re-entry. Loops stay until "Stop / remove all". A short grace period
     * covers async decode.
     */
    PruneFinished(now)
    {
        for (let i = this.emitters.length - 1; i >= 0; i--)
        {
            const item = this.emitters[i];
            if (item === this.#app.stage.draggingEmitter || now - item.born < 1000) continue;
            if (item.sequence && !item.sequenceDone) continue;   // sequence still running
            if (item.isLoop && !item.sequence) continue;         // manual loops persist
            const emitter = item.emitter;
            if (emitter.GetPlayingEvents().size || emitter.GetEventsOnWake().length || emitter.GetWaitingOneShot()) continue;
            emitter.UnregisterWwiseObject();
            this.#app.system.manager.UnregisterGameObject(emitter.ID);
            this.emitters.splice(i, 1);
        }
    }

    /**
     * Stop-and-remove one emitter (right-click, or a scheduled wind-down):
     * every playing instance fades out through the Carbon stop path, the
     * object leaves prioritization immediately (no re-wake during the
     * fade), and the node chain is torn down only after the fade has
     * played out - disconnecting gain/panner early would cut it short.
     */
    Remove(item, fadeMs = 1000)
    {
        const index = this.emitters.indexOf(item);
        if (index === -1) return;
        this.emitters.splice(index, 1);
        for (const playingID of [ ...item.emitter.GetPlayingEvents().keys() ])
        {
            item.emitter.StopSound(playingID, fadeMs);
        }
        this.#app.system.manager.UnregisterGameObject(item.emitter.ID);
        setTimeout(() => item.emitter.UnregisterWwiseObject(), fadeMs + 300);
    }

    /**
     * Remove everything. Immediate by default; with a stagger window each
     * emitter picks its own moment to start a randomized fade, so a scene
     * winds down loop by loop instead of cutting out at once.
     */
    Clear(staggerMs = 0)
    {
        for (const item of [ ...this.emitters ])
        {
            if (staggerMs) setTimeout(() => this.Remove(item, 500 + Math.random() * 2000), Math.random() * staggerMs);
            else this.Remove(item);
        }
    }

    #SpawnEmitter(radius, fixedPosition = null)
    {
        const emitter = new AudEmitter();
        if (fixedPosition)
        {
            Scene.SetEmitterPlacement(emitter, fixedPosition, this.listenerPosition);
            emitter.Wake();
            return { emitter, position: [ ...fixedPosition ], radius, born: performance.now() };
        }
        const stage = this.#app.stage;
        const angle = Math.random() * Math.PI * 2;
        // Spawn audible AND reachable: a ring around the LISTENER (range is
        // measured from it, wherever it was dragged) at 20-85% of the
        // effect's attenuation radius, clamped to the visible stage at the
        // current zoom so the dot never lands off-screen. Drag it away or
        // shrink its attenuation (wheel over the dot) to explore culling.
        const scale = stage.ViewScale();
        const viewLimit = scale > 0 ? (Math.min(stage.canvas.width, stage.canvas.height) * 0.4) / scale : 4000;
        const distance = Math.min(radius * (0.2 + Math.random() * 0.65), viewLimit * (0.2 + Math.random() * 0.8));
        const halfX = scale > 0 ? (stage.canvas.width * 0.47) / scale : 14000;
        const halfZ = scale > 0 ? (stage.canvas.height * 0.47) / scale : 14000;
        const position = [
            Math.max(-halfX, Math.min(halfX, this.listenerPosition[0] + Math.cos(angle) * distance)),
            0,
            Math.max(-halfZ, Math.min(halfZ, this.listenerPosition[2] + Math.sin(angle) * distance))
        ];
        Scene.SetEmitterPlacement(emitter, position, this.listenerPosition);
        emitter.Wake();
        return { emitter, position, radius, born: performance.now() };
    }

}


/**
 * The canvas view: world<->screen mapping, wheel zoom / per-emitter
 * attenuation scaling, listener + emitter dragging, the hover info card,
 * and the two-pass frame draw.
 */
class Stage
{

    /** @type {HTMLCanvasElement} */
    canvas = null;

    /** View zoom factor (canvas center = world origin) */
    zoom = 1;

    /** The emitter item currently being dragged, if any */
    draggingEmitter = null;

    /** @type {DemoApp} */
    #app = null;

    /** @type {CanvasRenderingContext2D} */
    #context2d = null;

    #draggingListener = false;
    #hud = null;
    #tip = null;
    #stageElement = null;

    constructor(app)
    {
        this.#app = app;
        this.canvas = document.getElementById("canvas");
        this.#context2d = this.canvas.getContext("2d");
        this.#hud = document.getElementById("hud");
        this.#tip = document.getElementById("tip");
        this.#stageElement = document.getElementById("stage");
        this.canvas.addEventListener("wheel", event => this.#OnWheel(event), { passive: false });
        this.canvas.addEventListener("pointerdown", event => this.#OnPointerDown(event));
        this.canvas.addEventListener("pointermove", event => this.#OnPointerMove(event));
        this.canvas.addEventListener("pointerup", event => this.#OnPointerUp(event));
        this.canvas.addEventListener("pointerleave", () => this.UpdateTip(null));
        this.canvas.addEventListener("contextmenu", event => this.#OnContextMenu(event));
    }

    /** World->screen scale: (min(w,h)/30000) * zoom */
    ViewScale()
    {
        return (Math.min(this.canvas.width, this.canvas.height) / 30000) * this.zoom;
    }

    CanvasToWorld(event)
    {
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.ViewScale();
        return [
            (event.clientX - rect.left - this.canvas.width / 2) / scale,
            0,
            (event.clientY - rect.top - this.canvas.height / 2) / scale
        ];
    }

    CanvasPoint(event)
    {
        const rect = this.canvas.getBoundingClientRect();
        return [ event.clientX - rect.left, event.clientY - rect.top ];
    }

    NearListener(event)
    {
        const [ px, py ] = this.CanvasPoint(event);
        const scale = this.ViewScale();
        const x = this.canvas.width / 2 + this.#app.scene.listenerPosition[0] * scale;
        const y = this.canvas.height / 2 + this.#app.scene.listenerPosition[2] * scale;
        return Math.hypot(px - x, py - y) < 18;
    }

    NearestEmitter(event)
    {
        const [ px, py ] = this.CanvasPoint(event);
        const scale = this.ViewScale();
        let best = null,
            bestDistance = 14;
        for (const item of this.#app.scene.emitters)
        {
            const x = this.canvas.width / 2 + item.position[0] * scale;
            const y = this.canvas.height / 2 + item.position[2] * scale;
            const distance = Math.hypot(px - x, py - y);
            if (distance < bestDistance)
            {
                best = item;
                bestDistance = distance;
            }
        }
        return best;
    }

    /** Hover info card: everything the engine knows about the emitter */
    UpdateTip(item, event = null)
    {
        const system = this.#app.system;
        if (!item || !system)
        {
            this.#tip.style.display = "none";
            return;
        }
        const scene = this.#app.scene;
        const activeName = item.sequence ? item.currentName : item.eventName;
        const record = this.#app.library.GetEventRecord(activeName) ?? {};
        const emitter = item.emitter;
        const distance = Math.hypot(item.position[0] - scene.listenerPosition[0], item.position[2] - scene.listenerPosition[2]);
        const level = system.backend?.GetGameObjLevel?.(emitter.ID) ?? 0;
        const title = item.sequence
            ? `${PrettyName(item.effectStem)}  ▶ ${PrettyName(activeName ?? "…")} (${item.sequenceIndex + 1}/${item.sequence.length})`
            : PrettyName(item.eventName);
        const flags = [ record.isLoop ? "loop" : "one-shot", record.isVital && "vital", record.is2D && "2D" ].filter(Boolean).join(" · ");
        const scalingText = item.scaling && Math.abs(item.scaling - 1) > 0.01 ? ` ×${item.scaling.toFixed(1)}` : "";
        this.#tip.textContent = [
            title,
            `${emitter.IsCulled() ? "culled" : "awake"} · playing ${emitter.GetPlayingEvents().size} · level ${level.toFixed(2)}`,
            flags,
            `distance ${Math.round(distance)} / hearing ~${Math.round((Math.max(1e-4, item.scaling ?? 1) / AUDIBLE_GAIN_FLOOR) / ACOUSTIC_SCALE)} / cull ${Math.round(item.radius)}${scalingText}`,
            `front ${Array.from(emitter.front, value => Math.abs(value) < 1e-3 ? 0 : value).map(value => value.toFixed(2)).join(", ")}${item.authoredYaw ? ` · authored yaw ${Math.round(item.authoredYaw * 180 / Math.PI)}°` : ""}`,
            `banks ${(record.soundbanks ?? []).join(", ") || "?"} · id ${record.eventID ?? "?"}`
        ].join("\n");
        const rect = this.#stageElement.getBoundingClientRect();
        this.#tip.style.display = "block";
        this.#tip.style.left = `${Math.min(event.clientX - rect.left + 16, rect.width - 280)}px`;
        this.#tip.style.top = `${Math.min(event.clientY - rect.top + 12, rect.height - 110)}px`;
    }

    Draw()
    {
        const context2d = this.#context2d;
        const scene = this.#app.scene;
        const system = this.#app.system;
        const w = this.canvas.width = this.canvas.clientWidth,
            h = this.canvas.height = this.canvas.clientHeight;
        context2d.fillStyle = "#0b0e14";
        context2d.fillRect(0, 0, w, h);
        context2d.font = "11px system-ui, sans-serif";
        const cx = w / 2,
            cy = h / 2,
            scale = this.ViewScale();
        const lx = cx + scene.listenerPosition[0] * scale,
            ly = cy + scene.listenerPosition[2] * scale;
        context2d.fillStyle = "#e2e8f0";
        context2d.beginPath();
        context2d.arc(lx, ly, 6, 0, 7);
        context2d.fill();
        context2d.strokeStyle = "rgba(226,232,240,0.35)";
        context2d.beginPath();
        context2d.arc(lx, ly, 12, 0, 7);
        context2d.stroke();
        let awake = 0;
        // Pass 1: every circle (rings, level meters, dots) so no circle can
        // ever paint over a label.
        const ringAlpha = Number(document.getElementById("ringAlpha").value) / 100;
        const showCullRings = document.getElementById("cullRings").checked;
        for (const item of scene.emitters)
        {
            const x = cx + item.position[0] * scale,
                y = cy + item.position[2] * scale;
            const culled = item.emitter.IsCulled();
            if (!culled) awake++;
            // Engine range check compares distanceSq against radiusSq *
            // scaling, so the effective ring radius grows with sqrt(scaling).
            const effectiveRadius = item.radius * Math.sqrt(item.scaling ?? 1);
            // What you can actually HEAR: where inverse-distance gain drops
            // to the audible floor under the acoustic scale (grows with
            // wheel-scaling).
            const hearingRadius = (Math.max(1e-4, item.scaling ?? 1) / AUDIBLE_GAIN_FLOOR) / ACOUSTIC_SCALE;
            // Filled hearing disc (~10% at default opacity) with a slightly
            // stronger border (~15%), both riding the ring-opacity slider.
            context2d.fillStyle = `rgba(148,163,184,${ringAlpha * 0.67})`;
            context2d.beginPath();
            context2d.arc(x, y, hearingRadius * scale, 0, 7);
            context2d.fill();
            context2d.strokeStyle = `rgba(255,255,255,${ringAlpha * 0.6})`;
            context2d.beginPath();
            context2d.arc(x, y, hearingRadius * scale, 0, 7);
            context2d.stroke();
            // The authored culling radius (often tens of km) - engine range, opt-in.
            if (showCullRings)
            {
                context2d.strokeStyle = `rgba(59,130,246,${Math.min(1, ringAlpha * 1.67)})`;
                context2d.beginPath();
                context2d.arc(x, y, effectiveRadius * scale, 0, 7);
                context2d.stroke();
            }
            // Live level meter: an inner disc pulsing from the center toward
            // the radius ring with the emitter's post-panner RMS (fast
            // attack, slow decay).
            const level = system.backend?.GetGameObjLevel?.(item.emitter.ID) ?? 0;
            const target = Math.min(1, Math.sqrt(level * 3));
            item.meter = Math.max(target, (item.meter ?? 0) * 0.92);
            if (item.meter > 0.01)
            {
                context2d.fillStyle = `rgba(52,211,153,${Math.min(1, ringAlpha * 1.2)})`;
                context2d.beginPath();
                context2d.arc(x, y, Math.max(6, hearingRadius * scale * item.meter), 0, 7);
                context2d.fill();
            }
            const front = item.emitter.front;
            context2d.strokeStyle = culled ? "#64748b" : "#7dd3fc";
            context2d.lineWidth = 2;
            context2d.beginPath();
            context2d.moveTo(x, y);
            context2d.lineTo(x + front[0] * 22, y + front[2] * 22);
            context2d.stroke();
            context2d.fillStyle = culled ? "#475569" : item.demo ? "#fbbf24" : "#34d399";
            context2d.beginPath();
            context2d.arc(x, y, 5, 0, 7);
            context2d.fill();
        }
        // Pass 2: all text, on top of every circle.
        context2d.fillStyle = "#e2e8f0";
        context2d.fillText("listener (drag me)", lx + 14, ly + 4);
        for (const item of scene.emitters)
        {
            const x = cx + item.position[0] * scale,
                y = cy + item.position[2] * scale;
            context2d.fillStyle = "#94a3b8";
            const suffix = (item.isLoop && !item.sequence ? " ⟲" : "") + (item.scaling && Math.abs(item.scaling - 1) > 0.01 ? ` ×${item.scaling.toFixed(1)}` : "");
            const label = PrettyName(item.sequence ? item.effectStem : item.eventName);
            context2d.fillText(label.slice(0, 28) + suffix, x + 8, y + 4);
            // Sequence emitters announce their current stage under the dot
            // so a lifecycle run is visibly more than one sample.
            if (item.sequence && !item.sequenceDone && item.currentName)
            {
                const stage = item.currentName.startsWith(item.effectStem + "_")
                    ? item.currentName.slice(item.effectStem.length + 1)
                    : item.currentName;
                context2d.textAlign = "center";
                context2d.fillStyle = item.currentIsLoop ? "#34d399" : "#7ea2d8";
                context2d.fillText(`▶ ${PrettyName(stage)} ${item.sequenceIndex + 1}/${item.sequence.length}`, x, y + 18);
                context2d.textAlign = "left";
            }
        }
        const stats = this.#app.media.stats;
        this.#hud.textContent = `emitters: ${scene.emitters.length}  awake: ${awake}  playing: ${system.backend?.GetPlayingCount() ?? 0}  media: ${stats.real} real / ${stats.synth} synth / ${stats.silent} silent  zoom: ${this.zoom >= 1 ? this.zoom.toFixed(1) : `1/${(1 / this.zoom).toFixed(1)}`}x`;
    }

    #OnWheel(event)
    {
        event.preventDefault();
        // Over an emitter: scale its attenuation (radius + loudness) through
        // the real engine path. Anywhere else: zoom the view.
        const item = this.NearestEmitter(event);
        if (item)
        {
            if (event.altKey)
            {
                item.authoredYaw = (item.authoredYaw ?? 0) + (event.deltaY < 0 ? Math.PI / 18 : -Math.PI / 18);
                const halfYaw = item.authoredYaw / 2;
                item.emitter.SetValues({
                    rotation: [ 0, Math.sin(halfYaw), 0, Math.cos(halfYaw) ]
                });
                return;
            }
            item.scaling = Math.min(20, Math.max(0.1, (item.scaling ?? 1) * (event.deltaY < 0 ? 1.15 : 1 / 1.15)));
            // Store first so a culled emitter replays the factor on Wake,
            // then push live (engine gates the backend call on awake+registered).
            item.emitter.scalingFactor = item.scaling;
            item.emitter.SetAttenuationScalingFactor(item.scaling);
            return;
        }
        this.zoom = Math.min(64, Math.max(1 / 16, this.zoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2)));
    }

    #OnPointerDown(event)
    {
        if (this.NearListener(event))
        {
            this.#draggingListener = true;
            this.canvas.setPointerCapture(event.pointerId);
            this.#app.scene.MoveListenerTo(this.CanvasToWorld(event));
            return;
        }
        const item = this.NearestEmitter(event);
        if (item)
        {
            this.draggingEmitter = item;
            this.canvas.setPointerCapture(event.pointerId);
            this.#app.scene.MoveEmitterTo(item, this.CanvasToWorld(event));
        }
    }

    #OnPointerMove(event)
    {
        if (this.#draggingListener)
        {
            this.#app.scene.MoveListenerTo(this.CanvasToWorld(event));
            this.UpdateTip(null);
        }
        else if (this.draggingEmitter)
        {
            this.#app.scene.MoveEmitterTo(this.draggingEmitter, this.CanvasToWorld(event));
            this.UpdateTip(null);
        }
        else
        {
            const hover = this.NearestEmitter(event);
            this.canvas.style.cursor = (this.NearListener(event) || hover) ? "grab" : "default";
            this.UpdateTip(hover, event);
        }
    }

    #OnPointerUp(event)
    {
        this.#draggingListener = false;
        this.draggingEmitter = null;
        this.canvas.releasePointerCapture?.(event.pointerId);
    }

    #OnContextMenu(event)
    {
        event.preventDefault();
        if (!this.#app.system) return;
        const item = this.NearestEmitter(event);
        if (item) this.#app.scene.Remove(item);
    }

}


/**
 * Dynamic music: an enabled checkbox, a mood dropdown steering the real EVE
 * switch container, and the one-line status hud. Dropdown entries are
 * deduplicated per DESTINATION so every offered mood is guaranteed to
 * change the music.
 */
class MusicUi
{

    /** Label of the mood currently steering the music */
    currentMood = "default";

    /** Music target id -> the human mood label that selected it */
    moodLabelByTarget = new Map();

    /** @type {AudMusicPlayer} */
    musicPlayer = null;

    /** @type {DemoApp} */
    #app = null;

    #hudElement = null;
    #dynamicRoot = null;
    #select = null;
    #moodEvents = [];

    constructor(app)
    {
        this.#app = app;
        this.#hudElement = document.getElementById("musicHud");
    }

    /** Builds the music panel once the audio system is enabled */
    Initialize()
    {
        const musicGraph = this.#app.library.music;
        // Carbon's dedicated music emitter (fixed game-object id 3).
        this.musicPlayer = new AudMusicPlayer();
        this.musicPlayer.Wake();
        document.getElementById("music").style.display = "";
        this.#select = document.getElementById("moods");
        this.#dynamicRoot = musicGraph.eventTargets["music_eve_dynamic_play"]?.[0];
        this.#moodEvents = Object.keys(musicGraph.switchSetters).filter(n => n.startsWith("music_switch_")).sort();
        this.#select.onchange = () => this.#SteerTo(this.#select.value);
        this.RefreshMoodAvailability();
        document.getElementById("musicToggle").onchange = event => this.SetEnabled(event.target.checked);
    }

    /** The enabled checkbox: checked starts the music graph, unchecked stops it */
    SetEnabled(enabled)
    {
        const toggle = document.getElementById("musicToggle");
        toggle.checked = enabled;
        if (!enabled)
        {
            this.musicPlayer.SendEvent("music_eve_dynamic_stop");
            return;
        }
        const engine = this.#app.system.musicEngine;
        const target = engine.PreviewSwitchEvent("", this.#dynamicRoot);
        if (target !== null && !this.moodLabelByTarget.has(target)) this.moodLabelByTarget.set(target, "default");
        this.musicPlayer.SendEvent("music_eve_dynamic_play");
        this.RefreshMoodAvailability();
    }

    /**
     * Availability is STATE-DEPENDENT: a mood's destination depends on the
     * current switch combination, so the dropdown is rebuilt after every
     * change, dropping moods that would resolve to nothing (unshipped/
     * authored-silence states). A mood is offered only when it would CHANGE
     * the music, and each DESTINATION is offered once: many moods alias the
     * same target (from the default state, zero_danger and the dungeon
     * levels all land on one playlist), so only the first alias
     * (alphabetical) is listed - every entry is guaranteed to lead
     * somewhere different. The active mood stays listed as the selected
     * entry ("default" gets a placeholder - it is a starting state, not a
     * settable mood).
     */
    RefreshMoodAvailability()
    {
        if (!this.#dynamicRoot || !this.#app.system?.musicEngine || !this.#select) return;
        const engine = this.#app.system.musicEngine;
        const current = engine.PreviewSwitchEvent("", this.#dynamicRoot);
        const offered = new Set();
        this.#select.innerHTML = "";
        let activeOption = null;
        for (const name of this.#moodEvents)
        {
            const label = name.slice("music_switch_".length);
            const target = engine.PreviewSwitchEvent(name, this.#dynamicRoot);
            const changes = target !== null && target !== current && !offered.has(target);
            if (changes) offered.add(target);
            if (!changes && label !== this.currentMood) continue;
            const option = document.createElement("option");
            option.value = name;
            option.textContent = label;
            this.#select.appendChild(option);
            if (label === this.currentMood) activeOption = option;
        }
        if (!activeOption)
        {
            activeOption = document.createElement("option");
            activeOption.value = "";
            activeOption.textContent = this.currentMood;
            activeOption.disabled = true;
            this.#select.prepend(activeOption);
        }
        activeOption.selected = true;
    }

    /**
     * Steers to the named mood when it is currently offered; returns
     * whether it was (the safe interface for scripted mood changes - a
     * missing entry means the mood would not change anything).
     */
    SelectMood(label)
    {
        const option = [ ...this.#select?.options ?? [] ].find(o => o.textContent === label && o.value);
        if (!option) return false;
        this.#select.value = option.value;
        this.#SteerTo(option.value);
        return true;
    }

    SelectRandomMood()
    {
        const options = [ ...this.#select?.options ?? [] ].filter(o => o.value && o.textContent !== this.currentMood);
        if (!options.length) return;
        const option = options[Math.floor(Math.random() * options.length)];
        this.#select.value = option.value;
        this.#SteerTo(option.value);
    }

    /**
     * Dynamic-music status: one plain line - what plays, what is fading out
     * (with its dropping volume), and the single queued mood while it loads.
     */
    UpdateHud()
    {
        const [ status ] = this.#app.system?.musicEngine?.GetStatus() ?? [];
        if (!status)
        {
            this.#hudElement.textContent = this.#app.library.music ? "music: stopped" : "";
            return;
        }
        const now = status.now;
        const label = segment => PrettyName(this.moodLabelByTarget.get(segment.targetId) ?? `seg ${segment.segmentId}`);
        const visible = status.segments
            .filter(s => now < (s.fading ? Math.min(s.fadeEndCtx ?? s.endCtx, s.endCtx) : s.endCtx));
        const playing = visible.find(s => !s.fading && s.startCtx <= now);
        const fadingOut = visible.find(s => s.fading && s.startCtx <= now);
        const parts = [];
        if (status.silent) parts.push("music: silence (nothing shipped for this state)");
        else if (playing) parts.push(`music: ${label(playing)}`);
        else if (fadingOut) parts.push(`music: ${label(fadingOut)} fading out`);
        else parts.push("music: starting…");
        if (playing && fadingOut)
        {
            const volume = Math.round(Math.max(0, Math.min(1, fadingOut.volume)) * 100);
            parts.push(`· ${label(fadingOut)} fading out ${volume}%`);
        }
        if (status.preparingTargetId) parts.push(`· next: ${PrettyName(this.currentMood)} (loading…)`);
        this.#hudElement.textContent = parts.join(" ");
    }

    #SteerTo(eventName)
    {
        if (!eventName) return;
        const engine = this.#app.system.musicEngine;
        // Only act when this mood would actually change the music - a no-op
        // selection must not relabel anything.
        const current = engine.PreviewSwitchEvent("", this.#dynamicRoot);
        const target = engine.PreviewSwitchEvent(eventName, this.#dynamicRoot);
        if (target === null || target === current) return;
        // Remember which mood selected this target so the hud can show a
        // human name instead of a segment id.
        const label = eventName.slice("music_switch_".length);
        this.moodLabelByTarget.set(target, label);
        this.musicPlayer.SendEvent(eventName);
        this.currentMood = label;
        this.RefreshMoodAvailability();
    }

}


/**
 * The prebuilt "Load demo" scene: hangar ambience loops ringed around the
 * listener, periodic door open/close pairs and ship warp transitions
 * (multi-stage one-shots), artillery barrages that score the music,
 * docking/undocking stories, occasional Aura hologram lines near the
 * listener, and dynamic music underneath.
 */
class Showcase
{

    /** @type {DemoApp} */
    #app = null;

    #running = false;
    #timers = [];
    #calmTimer = null;

    constructor(app)
    {
        this.#app = app;
    }

    Start()
    {
        if (this.#running) return;
        this.#running = true;
        document.getElementById("demoToggle").checked = true;
        const app = this.#app;
        const library = app.library;
        const pickFrom = re => library.eventNames.filter(n => re.test(n) && library.PlayableCandidates(n).length);
        const randomOf = list => list[Math.floor(Math.random() * list.length)];
        // Scheduled transients are tagged so the stage draws them amber.
        const demoSpawn = (name, position) =>
        {
            const item = app.scene.Spawn(name, null, position);
            if (item) item.demo = true;
            return item;
        };
        const demoSequence = (stem, position) =>
        {
            const item = app.scene.SpawnSequence(stem, position);
            if (item) item.demo = true;
            return item;
        };

        // Music bed.
        app.musicUi.SetEnabled(true);

        // A busy scene needs headroom: let every loop stay awake (drag the
        // slider down mid-demo to watch prioritization triage the scene).
        document.getElementById("maxAwake").value = 24;

        // The scene: ONE large ring of hangar/station loops out past the
        // hearing range (~3000) - from the center you barely hear them; drag
        // the listener toward a hangar to walk into its soundscape. Anchors
        // double as spawn points for the activity around them.
        const anchors = [];
        const sceneLoops = [
            ...pickFrom(/^Ambience_Hangar_(Amarr|Caldari|Gallente|Minmatar)_Play$/),
            ...pickFrom(/^air_hangar_play$/),
            ...pickFrom(/^hangar_platforms_aura_hologram_atmo_play$/),
            ...pickFrom(/^(amarr|caldari|gallente|minmatar)_hangar_announcements_play$/),
            ...pickFrom(/^citadel_(amarr|caldari|gallente)_play$/),
            ...pickFrom(/^(angel_outpost_atmo_play|autominer_atmo_loop_play|citadel_hangar_large_play)$/)
        ].slice(0, 13);
        // Randomized arrival: each loop keeps its ring slot but drifts around
        // it (angle and radius jitter), and starts on its own schedule over
        // the first seconds instead of everything at once. Anchors are laid
        // down immediately so the activity schedulers have targets from the
        // start; pending arrivals die with the demo (After() timers).
        sceneLoops.forEach((name, index) =>
        {
            const angle = (index / sceneLoops.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
            const radius = 4200 + (Math.random() - 0.5) * 1200;
            const position = [ Math.cos(angle) * radius, 0, Math.sin(angle) * radius ];
            anchors.push(position);
            this.After(Math.random() * 5000, () => app.scene.Spawn(name, null, position));
        });
        // Activity spawns cluster around the ring: a random anchor plus a
        // spread, pushed slightly outward.
        const nearAnchor = (spread = 600, outward = 300) =>
        {
            const anchor = randomOf(anchors) ?? this.RingPosition(2000);
            const drift = Math.random() * Math.PI * 2;
            const radial = Math.hypot(anchor[0], anchor[2]) || 1;
            return [
                anchor[0] + Math.cos(drift) * spread + (anchor[0] / radial) * outward,
                0,
                anchor[2] + Math.sin(drift) * spread + (anchor[2] / radial) * outward
            ];
        };

        // Doors: an open, then its close at the same spot a few seconds later.
        const doorOpen = pickFrom(/^hangar_door_open_play$/);
        const doorClose = pickFrom(/^hangar_door_close_play$/);
        if (doorOpen.length) this.Every(9000, 18000, () =>
        {
            const position = nearAnchor(500, 150);
            demoSpawn(doorOpen[0], position);
            if (doorClose.length) this.After(2500 + Math.random() * 2000, () => demoSpawn(doorClose[0], position));
        });

        // Warps: random ship transitions, departures and arrivals.
        const departures = pickFrom(/normal2warp_play$/);
        const arrivals = pickFrom(/warp2normal_play$/);
        if (departures.length || arrivals.length) this.Every(12000, 25000, () =>
        {
            const list = Math.random() < 0.5 && departures.length ? departures : arrivals;
            if (list.length) demoSpawn(randomOf(list), nearAnchor(800, 700));
        });

        // Artillery batteries: volleys of five, each shot slightly offset in
        // space and time like a battery walking fire, with a couple of
        // impacts landing beyond the muzzle cluster.
        const artillery = pickFrom(/^play_outburst_artillery_(L|M)_single_fire$/);
        const impacts = pickFrom(/^artillery_impact_(standard|large)$/);
        if (artillery.length) this.Every(14000, 28000, () =>
        {
            // Incoming fire scores the scene: danger now, calm again once
            // the barrages have stopped for a while.
            app.musicUi.SelectMood("danger");
            clearTimeout(this.#calmTimer);
            this.#calmTimer = setTimeout(() =>
            {
                app.musicUi.SelectMood("ambient") || app.musicUi.SelectMood("empire") || app.musicUi.SelectRandomMood();
            }, 45000);
            this.#timers.push(this.#calmTimer);
            const shot = randomOf(artillery);
            // Anywhere around the listener: from right on top out to a
            // distant boom. With the demo's 1/150 acoustic scale, ~3500
            // world units is where a loud one-shot fades to faraway thunder
            // (the authored 45-60km range would be silence here), so roll
            // the whole audible envelope.
            const base = this.RingPosition(Math.random() * 600);
            for (let i = 0; i < 5; i++)
            {
                this.After(i * (160 + Math.random() * 240), () => demoSpawn(shot, [
                    base[0] + (Math.random() - 0.5) * 600, 0, base[2] + (Math.random() - 0.5) * 600
                ]));
            }
            if (impacts.length) for (let i = 0; i < 2; i++)
            {
                this.After(900 + i * 500 + Math.random() * 400, () => demoSpawn(randomOf(impacts), [
                    base[0] + (Math.random() - 0.5) * 900 + 700, 0, base[2] + (Math.random() - 0.5) * 900
                ]));
            }
        });

        // Module lifecycles: afterburner and microwarpdrive runs walk their
        // full authored 5-stage sequence (activate/on -> idle hold ->
        // powerdown/deactivate); docking and undocking play as composed
        // stories.
        const lifecycleStems = library.effectStems.filter(s => /^ship_engine_(S|M|L|XL)_(afterburner|microwarpdrive)_3rd$/.test(s));
        const dockMsg = pickFrom(/^msg_DockingAccepted_play$/);
        const dockEngines = pickFrom(/^ship_engine_(S|M|L|XL)_docking$/);
        const dockExhausts = pickFrom(/^ship_engine_(S|M|L|XL)_docking_exhaust$/);
        const dockTransitions = pickFrom(/^transition_dock_(amarr|caldari|gallente|minmatar)_play$/);
        const undockTransitions = pickFrom(/^transition_undock_(amarr|caldari|gallente|minmatar)_play$/);
        const auraDockLines = pickFrom(/^voc_tutorial_aura_s.*tion_dock_0\d_play$/);
        const auraUndockLines = pickFrom(/^voc_tutorial_aura_s.*tion_undock_0\d_play$/);
        this.Every(16000, 32000, () =>
        {
            const roll = Math.random();
            const listenerPosition = app.scene.listenerPosition;
            if (roll < 0.4 && lifecycleStems.length)
            {
                demoSequence(randomOf(lifecycleStems), nearAnchor(700, 400));
            }
            else if (roll < 0.7)
            {
                const position = nearAnchor(600, 200);
                if (dockMsg.length) demoSpawn(dockMsg[0], [ listenerPosition[0] + 150, 0, listenerPosition[2] + 150 ]);
                this.After(1200, () =>
                {
                    if (dockEngines.length) demoSpawn(randomOf(dockEngines), position);
                    if (dockExhausts.length) demoSpawn(randomOf(dockExhausts), position);
                });
                if (dockTransitions.length) this.After(2600, () => demoSpawn(randomOf(dockTransitions), position));
                if (auraDockLines.length && Math.random() < 0.6)
                {
                    this.After(3600, () => demoSpawn(randomOf(auraDockLines), [ listenerPosition[0] + 220, 0, listenerPosition[2] - 180 ]));
                }
            }
            else
            {
                const position = nearAnchor(600, 200);
                if (undockTransitions.length) demoSpawn(randomOf(undockTransitions), position);
                this.After(1500, () =>
                {
                    if (dockEngines.length) demoSpawn(randomOf(dockEngines), position);
                });
                if (auraUndockLines.length && Math.random() < 0.6)
                {
                    this.After(800, () => demoSpawn(randomOf(auraUndockLines), [ listenerPosition[0] + 220, 0, listenerPosition[2] - 180 ]));
                }
            }
        });

        // Slow mood drift so long sessions wander the soundtrack.
        this.Every(75000, 140000, () => app.musicUi.SelectRandomMood());

        // Aura: hologram lines close to the listener.
        const aura = pickFrom(/^(aura_hologram_(welcome|goodbye)_capsuleer_play|npe_aura_incoming_transmission_play|career_portal_aura_assistance_play)$/);
        if (aura.length) this.Every(16000, 35000, () =>
        {
            const listenerPosition = app.scene.listenerPosition;
            demoSpawn(randomOf(aura), [ listenerPosition[0] + 250, 0, listenerPosition[2] - 250 ]);
        });
    }

    /** Cancels every scheduled event and clears the demo checkbox */
    Stop()
    {
        this.#running = false;
        for (const timer of this.#timers.splice(0)) clearTimeout(timer);
        document.getElementById("demoToggle").checked = false;
    }

    After(ms, fn)
    {
        this.#timers.push(setTimeout(fn, ms));
    }

    Every(minMs, maxMs, fn)
    {
        const loop = () =>
        {
            fn();
            this.#timers.push(setTimeout(loop, minMs + Math.random() * (maxMs - minMs)));
        };
        this.#timers.push(setTimeout(loop, 2000 + Math.random() * minMs));
    }

    /** A random point on a circle of the given radius around the listener */
    RingPosition(distance)
    {
        const listenerPosition = this.#app.scene.listenerPosition;
        const angle = Math.random() * Math.PI * 2;
        return [ listenerPosition[0] + Math.cos(angle) * distance, 0, listenerPosition[2] + Math.sin(angle) * distance ];
    }

}


/**
 * The searchable effect list: one line per stem, stages grouped. Clicking
 * plays the whole lifecycle sequence when the effect has stages, the single
 * sound otherwise. Shows RAW event names (pretty names are stage-only).
 */
class EffectListPanel
{

    /** @type {DemoApp} */
    #app = null;

    #list = null;

    constructor(app)
    {
        this.#app = app;
        this.#list = document.getElementById("events");
        document.getElementById("search").oninput = event => this.Render(event.target.value);
        this.Render("engine");
    }

    Render(filter = "")
    {
        const library = this.#app.library;
        const matches = library.effectStems.filter(stem => stem.toLowerCase().includes(filter.toLowerCase())).slice(0, 60);
        this.#list.innerHTML = "";
        for (const stem of matches)
        {
            const stages = library.effects.get(stem);
            const { radius, anyLoop, anyPlayable } = library.GetEffectMeta(stages);
            const item = document.createElement("li");
            if (!anyPlayable)
            {
                item.style.opacity = "0.45";
                item.title = "no shipped media - plays silence";
            }
            const kind = stages.size > 1 ? `${stages.size} stages` : (anyLoop ? "loop" : "one-shot");
            item.innerHTML = `<span>${stem}</span><span class="kind">${kind}</span><span class="radius">r${radius}</span>`;
            item.onclick = () =>
            {
                if (stages.size > 1) this.#app.scene.SpawnSequence(stem);
                else this.#app.scene.Spawn([ ...stages.values() ][0], stem);
            };
            this.#list.appendChild(item);
        }
    }

}


/**
 * The application: constructs every part, enables the audio system on user
 * gesture, applies the volume controls, and drives the frame loop.
 */
class DemoApp
{

    /** @type {CjsAudioSystem} */
    system = null;

    /** @type {AudioLibrary} */
    library = null;

    /** @type {MediaSource} */
    media = null;

    /** @type {Scene} */
    scene = null;

    /** @type {Stage} */
    stage = null;

    /** @type {MusicUi} */
    musicUi = null;

    /** @type {Showcase} */
    showcase = null;

    /** @type {EffectListPanel} */
    effectList = null;

    constructor(library)
    {
        this.library = library;
        this.media = new MediaSource(library);
        this.scene = new Scene(this);
        this.stage = new Stage(this);
        this.musicUi = new MusicUi(this);
        this.showcase = new Showcase(this);
        this.effectList = new EffectListPanel(this);
        document.getElementById("enable").onchange = event =>
        {
            if (event.target.checked) this.EnableAudio();
            else this.DisableAudio();
        };
        document.getElementById("demoToggle").onchange = event =>
        {
            if (event.target.checked) this.LoadShowcase();
            else this.StopDemo();
        };
        document.getElementById("worldScale").oninput = event => this.scene.SetWorldScale(Number(event.target.value) / 100);
    }

    EnableAudio()
    {
        if (this.system) return;
        this.system = new CjsAudioSystem({
            distanceScale: ACOUSTIC_SCALE,
            createContext: () => this.media.CreateContext(),
            loadBuffer: (eventID, eventName) => this.media.LoadEventBuffer(eventName),
            audioMetadata: this.library.metadata,
            musicGraph: this.library.music,
            loadMedia: sourceId => this.media.LoadMediaBuffer(sourceId)
        });
        this.system.Attach();
        // Enable with the full catalog: the ported engine gates PostEvent on
        // bank status, and the catalog-route backend completes loads
        // immediately.
        this.system.Enable(Object.keys(this.library.metadata.SoundBanks));
        this.media.ResumeContext();
        this.scene.listenerObject = new AudListener();
        this.scene.listenerObject.SetPosition([ 0, 0, -1 ], [ 0, 1, 0 ], this.scene.listenerPosition);
        if (this.library.music) this.musicUi.Initialize();
        // Volume controls. Music rides Carbon's authored volume RTPC (a 0..1
        // user setting, authored initial 0.75); SFX uses the CarbonEngineJS
        // sfx bus (Carbon has master + per-category levels, no single sfx
        // knob).
        document.getElementById("musicVol").oninput = () => this.ApplyVolumes();
        document.getElementById("sfxVol").oninput = () => this.ApplyVolumes();
        this.ApplyVolumes();
        // Reflect auto-enable paths (Load demo) in the checkbox.
        document.getElementById("enable").checked = true;
        // Dev/debug handle (console + automated checks).
        window.__demo = { system: this.system, emitters: this.scene.emitters, library: this.library.raw };
        requestAnimationFrame(now => this.#Tick(now));
    }

    LoadShowcase()
    {
        if (!this.system) this.EnableAudio();
        this.showcase.Start();
    }

    /**
     * Unchecking "audio" silences everything: stop the showcase, remove
     * every emitter, stop the music. The system stays constructed - checking
     * the box again resumes an empty, ready scene.
     */
    DisableAudio()
    {
        if (!this.system) return;
        this.StopAll();
        if (this.musicUi.musicPlayer) this.musicUi.SetEnabled(false);
    }

    /** Demo checkbox off: the scene winds down piece by piece over ~3s */
    StopDemo()
    {
        if (!this.system) return;
        this.showcase.Stop();
        this.scene.Clear(2500);
    }

    /** Audio checkbox off: everything stops now */
    StopAll()
    {
        if (!this.system) return;
        this.showcase.Stop();
        this.scene.Clear();
    }

    ApplyVolumes()
    {
        this.system.manager.SetGlobalRTPC("menu_main_music_level", Number(document.getElementById("musicVol").value) / 100);
        this.system.backend?.SetSfxVolume(Number(document.getElementById("sfxVol").value) / 100);
    }

    #Tick(now)
    {
        this.system.manager.soundPrioritization.SetMaxAwakeGameObjects(Number(document.getElementById("maxAwake").value));
        this.system.Process(now);
        this.scene.AdvanceSequences(now);
        this.scene.PruneFinished(now);
        this.stage.Draw();
        this.musicUi.UpdateHud();
        requestAnimationFrame(next => this.#Tick(next));
    }

}


new DemoApp(await AudioLibrary.Load());
