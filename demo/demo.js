// runtime-audio demo — complete library, authored graphs, no Trinity.
//
// Class-based demo application. Each class owns one concern:
//   AudioLibrary     the audio artifact + event/effect naming queries
//   MediaSource      structural individual/whole/range provider + media stats
//   Scene            listener + emitter population and lifecycle sequences
//   Stage            canvas view, pointer interaction, hover card, drawing
//   MusicUi          dynamic-music chips, play/stop, one-line status hud
//   JukeboxUi        optional titled-track library and direct playlist controls
//   SfxUi            authored containers, setters, and RTPC graph exercises
//   Showcase         the prebuilt "Load demo" scene and its schedulers
//   EffectListPanel  the searchable effect list on the left
//   DemoApp          CjsAudioMan wiring, enablement, and the frame loop

import {
    CjsAudioMan,
    CjsMusicEngine,
} from "/runtime-audio/npm/dist/index.js";

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

/** True while an emitter is playing or retaining work for a later wake. */
function IsEmitterBusy(emitter)
{
    return Boolean(
        emitter.GetPlayingEvents().size
        || emitter.GetEventsOnWake().length
        || emitter.GetWaitingOneShot(),
    );
}

/**
 * The audio artifact plus every naming/graph query the demo asks of it:
 * event records, playable media edges, and the effect/stage grouping the
 * list panel and lifecycle sequences are built from.
 */
class AudioLibrary
{

    #musicPlayableTargets = new Map();

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

    /**
     * True when a music target reaches at least one WEM record the browser
     * runtime can decode. MIDI-only authored destinations remain in the graph
     * but are not useful choices for this WebAudio demo.
     */
    MusicTargetHasPlayableMedia(rootId)
    {
        const key = String(rootId);

        if (this.#musicPlayableTargets.has(key))
        {
            return this.#musicPlayableTargets.get(key);
        }
        const graph = this.music;
        const pending = [ key ];
        const visited = new Set();
        const hasWemRecord = sourceId =>
        {
            const values = [
                this.raw.media?.[sourceId],
                this.raw.embeddedMedia?.[sourceId],
            ].flatMap(value => Array.isArray(value) ? value : [ value ]);

            return values.some(value =>
                value && (!value.mediaType || value.mediaType === "wem"));
        };

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);
            const node = graph?.nodes?.[id];

            if (!node)
            {
                continue;
            }
            const wemSources = new Set(
                (node.sources ?? [])
                    .filter(source => source.pluginId === 0x00040001)
                    .map(source => String(source.sourceId)),
            );

            if ((node.clips ?? []).some(clip =>
                wemSources.has(String(clip.sourceId))
                && hasWemRecord(clip.sourceId)))
            {
                this.#musicPlayableTargets.set(key, true);
                return true;
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child));
            }
        }
        this.#musicPlayableTargets.set(key, false);
        return false;
    }

    /** Authored SFX graph projected from the supplied BNK/HIRC data. */
    get sfx()
    {
        return this.raw.sfx ?? null;
    }

    /** Returns every authored node family reachable from one SFX event. */
    SfxNodeTypes(eventName)
    {
        const graph = this.sfx;
        const roots = graph?.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const types = new Set();

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes[id];

            if (!node)
            {
                continue;
            }

            types.add(node.type);
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }

        return [ ...types ];
    }

    /** Returns every reachable Continuous container family and transition. */
    SfxContinuousTypes(eventName)
    {
        const graph = this.sfx;
        const roots = graph?.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const types = new Set();

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes[id];

            if (!node)
            {
                continue;
            }
            if (node.continuous)
            {
                types.add(
                    `${node.type}:${node.continuous.transition}`,
                );
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }

        return [ ...types ];
    }

    /**
     * Returns the authored setters and interactive branch/gain controls
     * reachable from one SFX event.
     */
    SfxControls(eventName)
    {
        const graph = this.sfx ?? {};
        const roots = graph.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const switches = new Map();
        const rtpcs = new Map();
        const collectCurve = (curve, property) =>
        {
            const xs = (curve.points ?? [])
                .map(point => Number(point.x))
                .filter(Number.isFinite);

            if (!xs.length)
            {
                return;
            }

            const key = `${curve.scope}:${curve.rtpc}`;
            const current = rtpcs.get(key) ?? {
                name: curve.rtpc,
                scope: curve.scope,
                min: Math.min(...xs),
                max: Math.max(...xs),
                properties: new Set(),
            };

            current.min = Math.min(current.min, ...xs);
            current.max = Math.max(current.max, ...xs);
            current.properties.add(property);
            rtpcs.set(key, current);
        };
        const collectCurves = value =>
        {
            for (const curve of value?.gainCurves ?? [])
            {
                collectCurve(curve, "layerGain");
            }
            for (const curve of value?.rtpcCurves ?? [])
            {
                collectCurve(curve, curve.property);
            }
        };

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes?.[id];

            if (!node)
            {
                continue;
            }

            collectCurves(node);
            if (node.type === "switch")
            {
                const key = `${node.scope}:${node.group}`;
                const current = switches.get(key) ?? {
                    group: node.group,
                    scope: node.scope,
                    values: new Set(),
                    value: null,
                };
                const entries = Object.entries(node.cases ?? {});

                for (const [ value, child ] of entries)
                {
                    current.values.add(value);
                    if (node.default
                        && String(child.nodeId) === String(node.default.nodeId))
                    {
                        current.value = value;
                    }
                }
                current.value ??= entries[0]?.[0] ?? "";
                switches.set(key, current);
            }
            for (const child of node.children ?? [])
            {
                collectCurves(child);
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                collectCurves(child);
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                collectCurves(node.default);
                pending.push(String(node.default.nodeId));
            }
        }

        const program = [ ...(graph.programs?.[eventName] ?? []) ];

        return {
            program,
            actions: program.filter(action => action.kind !== "play"),
            switches: [ ...switches.values() ].map(control => ({
                ...control,
                values: [ ...control.values ],
            })),
            rtpcs: [ ...rtpcs.values() ].map(control => ({
                ...control,
                properties: [ ...control.properties ],
            })),
        };
    }

    /** Explains what one selected authored SFX example demonstrates. */
    SfxDescription(type, eventName)
    {
        const controls = this.SfxControls(eventName);
        const actionText = controls.actions
            .map(FormatSfxProgramAction)
            .join(", then ");

        if (type === "sound")
        {
            return "Posts one direct authored Sound leaf through the same media-selection and delivery path used by every other example.";
        }
        if (type === "random")
        {
            return "Chooses one eligible child per post using the container's authored random weights and repeat-avoidance rules.";
        }
        if (type === "sequence")
        {
            return "Repeated posts advance the authored Step sequence because this panel retains one emitter. Reset clears its sequence position.";
        }
        if (type === "continuous random delay")
        {
            return "One post traverses the authored Continuous Random playlist. Each child begins only after the previous child finishes and its independently randomized Wwise Delay expires. Reset stops the active traversal.";
        }
        if (type === "continuous random trigger rate")
        {
            return "One post traverses the authored Continuous Random playlist on its Wwise Trigger Rate clock. A new child starts after the authored interval plus that child's Initial Delay, so longer sounds deliberately overlap. Reset stops future triggers and the active voices.";
        }
        if (type === "continuous random crossfade")
        {
            return "One post traverses the authored Continuous Random playlist with Wwise constant-amplitude Crossfades. The next child is prefetched, begins before the current file ends, and overlaps through the authored duration (clamped to half the outgoing file). Reset stops the active traversal.";
        }
        if (type === "continuous random")
        {
            return "One post traverses the authored Continuous Random playlist, selecting the next child at each completion boundary with its Random or Shuffle and repeat-avoidance rules. Reset stops the active traversal.";
        }
        if (type === "continuous sequence delay")
        {
            return "One post traverses the authored Continuous Sequence playlist in order. Each next child uses the container's Wwise Delay; Reset stops the active traversal.";
        }
        if (type === "continuous sequence")
        {
            return "One post traverses the authored Continuous Sequence playlist in order, advancing only when the complete current child batch finishes. Reset stops the active traversal.";
        }
        if (type === "parallel")
        {
            return "Resolves every authored child as simultaneous voices owned by one playing ID and started on the same sample boundary.";
        }
        if (type === "switch action" || type === "state action")
        {
            return `This event applies ${actionText} in authored order, affecting only later Play actions in the same program.`;
        }
        if (type === "setter only")
        {
            return `Applies ${actionText} without posting an audio root. This is an authored control event, so silence is expected.`;
        }
        if (type === "stop action")
        {
            const programText = controls.program
                .map(FormatSfxProgramAction)
                .join(", then ");

            return `Runs this ordered authored program: ${programText}. Stops use their decoded scope, hierarchy target, delay, transition, curve, and exceptions.`;
        }
        if (type === "voice volume action")
        {
            const programText = controls.program
                .map(FormatSfxProgramAction)
                .join(", then ");

            return `Runs this ordered authored program: ${programText}. Set Voice Volume persists on the target hierarchy element, Relative values accumulate, Reset returns its contribution to 0 dB, and authored delays and fades use the audio clock.`;
        }
        if (type === "switch container")
        {
            const control = controls.switches[0];
            const cases = control?.values.join(", ") || "its authored cases";
            const scope = control?.scope === "state"
                ? "global state"
                : "object switch";
            const route = this.PlayableCandidates(eventName).length
                ? "Only the selected branch is played."
                : "Every decoded case in this build routes to authored silence.";

            return `Reads the ${scope} ${control?.group ?? ""} and selects one of ${cases}. ${route}`;
        }
        if (type === "RTPC blend")
        {
            const control = controls.rtpcs.find(value =>
                value.properties.includes("layerGain"));
            const sounds = this.PlayableCandidates(eventName).length;

            return `Uses the ${control?.scope ?? "object"} RTPC ${control?.name ?? ""} from ${FormatControlValue(control?.min ?? 0)} to ${FormatControlValue(control?.max ?? 0)} to change the live gains of ${sounds} authored sound layers. Move the slider during playback or post again at a new value.`;
        }
        if (type === "NodeBase RTPC")
        {
            const control = controls.rtpcs.find(value =>
                value.properties.some(property =>
                    property !== "layerGain"));
            const properties = control?.properties
                .filter(property => property !== "layerGain")
                .map(FormatRtpcProperty)
                .join(" and ") || "playback properties";

            return `Uses the authored ${control?.scope ?? "object"} Game Parameter ${control?.name ?? ""} from ${FormatControlValue(control?.min ?? 0)} to ${FormatControlValue(control?.max ?? 0)} to change ${properties}. Volume and pitch stay live; initial delay is captured when you post.`;
        }

        return "Posts the selected authored SFX graph on one retained emitter.";
    }

    /**
     * Selects one deterministic, playable event for each authored container
     * family present in the demo library.
     */
    SfxExamples()
    {
        const definitions = [
            {
                type: "sound",
                preferred: [ "dungeon_particle_accelerator_play" ],
                matches: name => this.SfxNodeTypes(name).includes("sound"),
            },
            {
                type: "random",
                preferred: [ "Play_explosion_large" ],
                matches: name => this.SfxNodeTypes(name).includes("random"),
            },
            {
                type: "sequence",
                preferred: [ "msg_fittingSlotHi_play" ],
                matches: name => this.SfxNodeTypes(name).includes("sequence"),
            },
            {
                type: "continuous random delay",
                preferred: [ "space_cathedral_play" ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("random:delay"),
            },
            {
                type: "continuous random trigger rate",
                preferred: [ "OSSE_amarr_running_lights_play" ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("random:trigger-rate"),
            },
            {
                type: "continuous random crossfade",
                preferred: [
                    "drone_grown_infested_structure_large_play",
                ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("random:crossfade-amplitude"),
            },
            {
                type: "continuous random",
                preferred: [ "phase_anchor_atmo_play" ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("random:disabled"),
            },
            {
                type: "continuous sequence delay",
                preferred: [ "pvp_arena_clock_tick_loop_play" ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("sequence:delay"),
            },
            {
                type: "continuous sequence",
                preferred: [ "remote_hullrepair" ],
                matches: name => this.SfxContinuousTypes(name)
                    .includes("sequence:disabled"),
            },
            {
                type: "parallel",
                preferred: [ "microjumpdrive_cycle_play" ],
                matches: name => this.SfxNodeTypes(name).includes("parallel"),
            },
            {
                type: "switch action",
                preferred: [ "es_screen_2_2_play" ],
                matches: name => this.sfx?.programs?.[name]
                    ?.some(action => action.kind === "switch")
                    && Boolean(this.sfx?.events?.[name]),
            },
            {
                type: "state action",
                preferred: [ "isInsideFractureBubble_yes" ],
                matches: name => this.sfx?.programs?.[name]
                    ?.some(action => action.kind === "state")
                    && Boolean(this.sfx?.events?.[name]),
            },
            {
                type: "stop action",
                preferred: [ "Abyssal_exit_play" ],
                matches: name => this.sfx?.programs?.[name]
                    ?.some(action => action.kind === "stop"),
            },
            {
                type: "voice volume action",
                preferred: [ "stagecoach_idle_loop_play" ],
                matches: name => this.sfx?.programs?.[name]
                    ?.some(action =>
                        action.kind === "set-voice-volume"
                        || action.kind === "reset-voice-volume"),
            },
            {
                type: "setter only",
                preferred: [ "charge_abyssal_switch" ],
                matches: name =>
                    this.sfx?.programs?.[name]?.length > 0
                    && this.sfx.programs[name].every(action =>
                        action.kind === "switch"
                        || action.kind === "state")
                    && !this.sfx?.events?.[name],
            },
            {
                type: "switch container",
                preferred: [ "phased_asteroid_collapsed" ],
                matches: name => this.SfxNodeTypes(name).includes("switch"),
            },
            {
                type: "RTPC blend",
                preferred: [ "msg_newscan_probe_scan_results_play" ],
                matches: name => this.SfxNodeTypes(name).includes("blend"),
            },
            {
                type: "NodeBase RTPC",
                preferred: [ "Cyno_lightning_play" ],
                matches: name => this.SfxControls(name).rtpcs
                    .some(control => control.properties
                        .some(property => property !== "layerGain")),
            },
        ];
        const eventNames = Object.keys(this.sfx?.events ?? {}).sort();
        const actionNames = Object.keys(this.sfx?.programs ?? {}).sort();
        const allNames = [ ...new Set([ ...eventNames, ...actionNames ]) ];
        const examples = [];
        const selected = new Set();

        for (const definition of definitions)
        {
            const preferred = definition.preferred.find(name =>
                definition.matches(name));
            const eventName = preferred ?? allNames.find(name =>
                !selected.has(name) && definition.matches(name));

            if (eventName)
            {
                selected.add(eventName);
                examples.push({
                    eventName,
                    type: definition.type,
                    nodeTypes: this.SfxNodeTypes(eventName),
                    description: this.SfxDescription(
                        definition.type,
                        eventName,
                    ),
                });
            }
        }

        return examples;
    }

    GetEventRecord(eventName)
    {
        const record = this.raw.metadata.Events[eventName];

        return record
            ? {
                ...record,
                isLoop: this.EventMayLoop(eventName) ? 1 : 0,
            }
            : undefined;
    }

    /**
     * True when an exact authored SFX branch can play an infinite Sound loop.
     *
     * A supplied enrichment flag remains the fallback for older graphs whose
     * Sound leaves do not carry an explicit override.
     */
    EventMayLoop(eventName)
    {
        const graph = this.sfx;
        const roots = graph?.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const fallback = Boolean(
            this.raw.metadata.Events[eventName]?.isLoop,
        );

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes[id];

            if (!node)
            {
                continue;
            }
            if (node.type === "sound")
            {
                if (node.loop === undefined ? fallback : node.loop)
                {
                    return true;
                }
                continue;
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }

        return false;
    }

    /**
     * True when every possible Sound leaf is an infinite loop delivered from
     * an embedded BNK range. The committed showcase uses this stricter subset
     * so a visible startup source never depends on an unavailable loose WEM.
     */
    EventHasSelfContainedLoop(eventName)
    {
        const graph = this.sfx;
        const roots = graph?.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const fallback = Boolean(
            this.raw.metadata.Events[eventName]?.isLoop,
        );
        let soundCount = 0;

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes[id];

            if (!node || node.type === "silence")
            {
                return false;
            }
            if (node.type === "sound")
            {
                soundCount++;
                const loops = node.loop === undefined
                    ? fallback
                    : node.loop;
                const url = this.WemUrl(String(node.mediaId));

                if (!loops || !url?.startsWith("/bankwem/"))
                {
                    return false;
                }
                continue;
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }

        return soundCount > 0;
    }

    /**
     * Returns the media leaves reachable through the exact authored SFX graph.
     *
     * The legacy flat eventMedia table was recovered by scanning undecoded
     * container bytes for values that resembled object or WEM ids. It is useful
     * as diagnostic reachability data, but it is not safe as a playback route:
     * a false-positive id can select an unrelated voice line. The demo therefore
     * fails closed for events outside the validated SFX graph.
     */
    PlayableCandidates(eventName)
    {
        const graph = this.sfx;
        const roots = graph?.events?.[eventName] ?? [];
        const pending = roots.map(root => String(root.nodeId));
        const visited = new Set();
        const media = new Set();

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = graph.nodes[id];

            if (!node)
            {
                continue;
            }
            if (node.type === "sound")
            {
                const mediaId = String(node.mediaId);

                if (this.WemUrl(mediaId))
                {
                    media.add(mediaId);
                }
                continue;
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }

        return [ ...media ];
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
        const playable = stage =>
            stages.has(stage)
            && this.PlayableCandidates(stages.get(stage)).length > 0;

        for (const stage of [ "on", "activate", "begin", "start" ]) if (playable(stage)) sequence.push(stage);
        if (playable("idle")) sequence.push("idle");
        if (playable("active"))
        {
            sequence.push("active");
            if (playable("idle")) sequence.push("idle");
        }
        for (const stage of [ "fire", "play", "event" ]) if (playable(stage)) sequence.push(stage);
        for (const stage of [ "end", "powerdown", "deactivate", "stop", "off" ]) if (playable(stage)) sequence.push(stage);
        return sequence.length
            ? sequence
            : [ ...stages.keys() ].filter(playable).slice(0, 1);
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

/** The separate, optional neutral music-library catalog used by the jukebox. */
class JukeboxLibrary
{

    static async Load()
    {
        const raw = await FetchLibraryJson(
            new URL("./eve-online-music-library.json", import.meta.url),
        );

        if (!raw)
        {
            throw new Error("No demo music-library catalog is available");
        }
        return raw;
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
 * Structural provider for CjsAudioMan. It only acquires caller-selected
 * records; runtime-audio owns representation choice, WEM preparation,
 * decoding, and decoded/whole-bank retention.
 */
class MediaSource
{

    /** Provider-operation tallies for the HUD. */
    stats = { individual: 0, range: 0, whole: 0, failed: 0 };

    /** @type {AudioContext} */
    #context = null;

    /** CjsAudioMan's user-gesture context factory. */
    CreateContext()
    {
        return this.#context = new AudioContext();
    }

    ResumeContext()
    {
        this.#context?.resume?.();
    }

    /** Reads one individual media file or one complete original bank. */
    async Read(source, context = {})
    {
        const route = context.kind === "bank" ? "whole" : "individual";
        const url = source?.storagePath
            ? `/cache/${source.storagePath}`
            : source?.url;

        this.stats[route]++;
        return this.#Fetch(url, context.signal, source?.mediaType);
    }

    /** Reads one exact embedded WEM member selected by CjsAudioMan. */
    async ReadRange(bank, context)
    {
        this.stats.range++;
        return this.#Fetch(
            `/range/${encodeURIComponent(bank.storagePath)}`
                + `?offset=${context.offset}`
                + `&byteLength=${context.byteLength}`,
            context.signal,
            "wem",
        );
    }

    /** Acquires one caller-selected jukebox path; runtime owns its decoding. */
    async ReadMusicTrack(song, { signal } = {})
    {
        const source = song.url ?? song.path;
        const response = await fetch(source, { signal });

        if (!response.ok)
        {
            throw new Error(
                response.status === 404
                    ? "Track is not downloaded; run npm run demo:music"
                    : `Track unavailable: ${response.status}`,
            );
        }
        return response.arrayBuffer();
    }

    /** Checks a caller-owned song URL without transferring its audio body. */
    async IsMusicTrackAvailable(song, { signal } = {})
    {
        const source = song.url ?? song.path;
        const response = await fetch(source, {
            method: "HEAD",
            signal,
        }).catch(() => null);

        return Boolean(response?.ok);
    }

    async #Fetch(url, signal, mediaType = "")
    {
        if (!url)
        {
            this.stats.failed++;
            throw new Error("Audio source has no provider route");
        }

        const response = await fetch(url, { signal }).catch(error =>
        {
            this.stats.failed++;
            throw error;
        });

        if (!response.ok)
        {
            this.stats.failed++;
            throw new Error(`Audio unavailable: ${response.status}`);
        }

        return {
            bytes: await response.arrayBuffer(),
            mediaType,
        };
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
        if (!this.#app.IsAudioEnabled()
            || !this.#app.library.PlayableCandidates(eventName).length)
        {
            return;
        }
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
     * Adds one retained emitter to the visible scene without posting yet.
     * Callers may post repeatedly on the returned object to preserve authored
     * per-emitter graph state such as Step sequence position.
     */
    SpawnPersistent(eventName, name, fixedPosition)
    {
        if (!this.#app.IsAudioEnabled()) return;
        const record = this.#app.library.GetEventRecord(eventName) ?? {};
        const item = this.#SpawnEmitter(
            Math.max(500, record.maxRadiusAttenuation || 2000),
            fixedPosition,
            { name },
        );
        item.eventName = eventName;
        item.persistent = true;
        item.authoredSfx = true;
        this.emitters.push(item);
        return item;
    }

    /**
     * One emitter walking the effect's lifecycle: loops hold then advance,
     * one-shots play out; advancing stops the previous loop through the
     * engine's StopEvent as explicit showcase choreography.
     */
    SpawnSequence(stem, fixedPosition = null)
    {
        if (!this.#app.IsAudioEnabled()) return;
        const stages = this.#app.library.effects.get(stem);
        const { radius } = this.#app.library.GetEffectMeta(stages);
        const sequence = this.#app.library.SequenceFor(stages)
            .map(stage => stages.get(stage));

        if (!sequence.length)
        {
            return;
        }
        const item = this.#SpawnEmitter(Math.max(500, radius || 2000), fixedPosition);
        item.effectStem = stem;
        item.sequence = sequence;
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
            if (item.persistent) continue;
            if (item.sequence && !item.sequenceDone) continue;   // sequence still running
            if (item.isLoop && !item.sequence) continue;         // manual loops persist
            const emitter = item.emitter;
            if (IsEmitterBusy(emitter)) continue;
            this.#app.audio.ReleaseEmitter(emitter);
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
        if (item === this.#app.stage.draggingEmitter)
        {
            this.#app.stage.draggingEmitter = null;
            this.#app.stage.UpdateTip(null);
        }
        item.onRemove?.();
        if (fadeMs <= 0)
        {
            this.#app.audio?.ReleaseEmitter(item.emitter);
            return;
        }
        for (const playingID of [ ...item.emitter.GetPlayingEvents().keys() ])
        {
            item.emitter.StopSound(playingID, fadeMs);
        }
        this.#app.system.manager.UnregisterGameObject(item.emitter.ID);
        setTimeout(
            () => this.#app.audio?.ReleaseEmitter(item.emitter),
            fadeMs + 300,
        );
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

    #SpawnEmitter(radius, fixedPosition = null, options = undefined)
    {
        const emitter = this.#app.audio.CreateEmitter(options);
        if (fixedPosition)
        {
            Scene.SetEmitterPlacement(emitter, fixedPosition, this.listenerPosition);
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
        const minX = stage.viewCenter[0] - halfX,
            maxX = stage.viewCenter[0] + halfX,
            minZ = stage.viewCenter[1] - halfZ,
            maxZ = stage.viewCenter[1] + halfZ;
        const listenerInView = this.listenerPosition[0] >= minX
            && this.listenerPosition[0] <= maxX
            && this.listenerPosition[2] >= minZ
            && this.listenerPosition[2] <= maxZ;
        const candidate = [
            this.listenerPosition[0] + Math.cos(angle) * distance,
            0,
            this.listenerPosition[2] + Math.sin(angle) * distance,
        ];
        const position = listenerInView
            ? [
                Math.max(minX, Math.min(maxX, candidate[0])),
                0,
                Math.max(minZ, Math.min(maxZ, candidate[2])),
            ]
            : candidate;
        Scene.SetEmitterPlacement(emitter, position, this.listenerPosition);
        return { emitter, position, radius, born: performance.now() };
    }

}


/**
 * The canvas view: world<->screen mapping, camera pan, wheel zoom /
 * per-emitter attenuation scaling, listener + emitter dragging, the hover
 * info card, and the two-pass frame draw.
 */
class Stage
{

    /** @type {HTMLCanvasElement} */
    canvas = null;

    /** View zoom factor. */
    zoom = 1;

    /** World x/z coordinate shown at the center of the canvas. */
    viewCenter = [ 0, 0 ];

    /** The emitter item currently being dragged, if any */
    draggingEmitter = null;

    /** @type {DemoApp} */
    #app = null;

    /** @type {CanvasRenderingContext2D} */
    #context2d = null;

    #activePointerId = null;
    #draggingListener = false;
    #panAnchorWorld = null;
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
        this.canvas.addEventListener("pointercancel", event => this.#OnPointerUp(event));
        this.canvas.addEventListener("lostpointercapture", event => this.#EndPointer(event.pointerId, false));
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
        const [ x, y ] = this.CanvasPoint(event);
        const scale = this.ViewScale();
        return [
            this.viewCenter[0] + (x - this.canvas.width / 2) / scale,
            0,
            this.viewCenter[1] + (y - this.canvas.height / 2) / scale
        ];
    }

    CanvasPoint(event)
    {
        const rect = this.canvas.getBoundingClientRect();
        return [ event.clientX - rect.left, event.clientY - rect.top ];
    }

    WorldToCanvas(position)
    {
        const scale = this.ViewScale();
        return [
            this.canvas.width / 2 + (position[0] - this.viewCenter[0]) * scale,
            this.canvas.height / 2 + (position[2] - this.viewCenter[1]) * scale,
        ];
    }

    NearListener(event)
    {
        const [ px, py ] = this.CanvasPoint(event);
        const [ x, y ] = this.WorldToCanvas(this.#app.scene.listenerPosition);
        return Math.hypot(px - x, py - y) < 18;
    }

    NearestEmitter(event)
    {
        const [ px, py ] = this.CanvasPoint(event);
        let best = null,
            bestDistance = 14;
        for (const item of this.#app.scene.emitters)
        {
            const [ x, y ] = this.WorldToCanvas(item.position);
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
            `${emitter.IsCulled() ? "culled" : IsEmitterBusy(emitter) ? "active" : "idle"} · playing ${emitter.GetPlayingEvents().size} · level ${level.toFixed(2)}`,
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
        const scale = this.ViewScale();
        const [ lx, ly ] = this.WorldToCanvas(scene.listenerPosition);
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
            const [ x, y ] = this.WorldToCanvas(item.position);
            const culled = item.emitter.IsCulled();
            const idleAuthoredSfx = item.authoredSfx && !IsEmitterBusy(item.emitter);
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
            context2d.beginPath();
            context2d.arc(x, y, 5, 0, 7);
            if (idleAuthoredSfx && !culled)
            {
                context2d.fillStyle = "#0b0e14";
                context2d.fill();
                context2d.strokeStyle = "#c084fc";
                context2d.lineWidth = 2;
                context2d.stroke();
            }
            else
            {
                context2d.fillStyle = culled ? "#475569" : item.demo ? "#fbbf24" : item.authoredSfx ? "#c084fc" : "#34d399";
                context2d.fill();
            }
        }
        // Pass 2: all text, on top of every circle.
        context2d.fillStyle = "#e2e8f0";
        context2d.fillText("listener (drag me)", lx + 14, ly + 4);
        for (const item of scene.emitters)
        {
            const [ x, y ] = this.WorldToCanvas(item.position);
            context2d.fillStyle = "#94a3b8";
            const suffix = (item.isLoop && !item.sequence ? " ⟲" : "")
                + (item.authoredSfx && !IsEmitterBusy(item.emitter) ? " · idle" : "")
                + (item.scaling && Math.abs(item.scaling - 1) > 0.01 ? ` ×${item.scaling.toFixed(1)}` : "");
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
        this.#hud.textContent = `emitters: ${scene.emitters.length}  awake: ${awake}  playing: ${system.backend?.GetPlayingCount() ?? 0}  reads: ${stats.individual} file / ${stats.range} range / ${stats.whole} whole / ${stats.failed} failed  zoom: ${this.zoom >= 1 ? this.zoom.toFixed(1) : `1/${(1 / this.zoom).toFixed(1)}`}x  view: ${Math.round(this.viewCenter[0])}, ${Math.round(this.viewCenter[1])}`;
    }

    #OnWheel(event)
    {
        event.preventDefault();
        if (this.#activePointerId !== null) return;
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
        if (event.button !== 0 || this.#activePointerId !== null) return;
        this.#activePointerId = event.pointerId;
        const item = this.NearestEmitter(event);
        if (item)
        {
            this.draggingEmitter = item;
            this.canvas.setPointerCapture(event.pointerId);
            this.canvas.style.cursor = "grabbing";
            this.#app.scene.MoveEmitterTo(item, this.CanvasToWorld(event));
            return;
        }
        if (this.NearListener(event))
        {
            this.#draggingListener = true;
            this.canvas.setPointerCapture(event.pointerId);
            this.canvas.style.cursor = "grabbing";
            this.#app.scene.MoveListenerTo(this.CanvasToWorld(event));
            return;
        }
        this.#panAnchorWorld = this.CanvasToWorld(event);
        this.canvas.setPointerCapture(event.pointerId);
        this.canvas.style.cursor = "grabbing";
        this.UpdateTip(null);
    }

    #OnPointerMove(event)
    {
        if (this.#activePointerId !== null && event.pointerId !== this.#activePointerId)
        {
            return;
        }
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
        else if (this.#panAnchorWorld)
        {
            const [ x, y ] = this.CanvasPoint(event);
            const scale = this.ViewScale();
            this.viewCenter[0] = this.#panAnchorWorld[0] - (x - this.canvas.width / 2) / scale;
            this.viewCenter[1] = this.#panAnchorWorld[2] - (y - this.canvas.height / 2) / scale;
            this.canvas.style.cursor = "grabbing";
            this.UpdateTip(null);
        }
        else
        {
            const hover = this.NearestEmitter(event);
            this.canvas.style.cursor = (this.NearListener(event) || hover) ? "move" : "grab";
            this.UpdateTip(hover, event);
        }
    }

    #OnPointerUp(event)
    {
        this.#EndPointer(event.pointerId, true);
    }

    #EndPointer(pointerId, releaseCapture)
    {
        if (pointerId !== this.#activePointerId) return;
        this.#activePointerId = null;
        this.#draggingListener = false;
        this.draggingEmitter = null;
        this.#panAnchorWorld = null;
        this.canvas.style.cursor = "grab";
        if (releaseCapture && this.canvas.hasPointerCapture?.(pointerId))
        {
            this.canvas.releasePointerCapture(pointerId);
        }
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

    #retryButton = null;

    #moodEvents = [];
    constructor(app)
    {
        this.#app = app;
        this.#hudElement = document.getElementById("musicHud");
    }

    /** Builds the music panel once the audio system is enabled */
    Initialize()
    {
        if (this.musicPlayer)
        {
            return;
        }

        const musicGraph = this.#app.library.music;
        // Carbon's manager-owned dedicated music emitter (fixed id 3).
        this.musicPlayer = this.#app.audio.GetMusicPlayer();
        document.getElementById("music").style.display = "";
        this.#select = document.getElementById("moods");
        this.#retryButton = document.getElementById("musicRetry");
        this.#dynamicRoot = musicGraph.eventTargets["music_eve_dynamic_play"]?.[0];
        this.#moodEvents = Object.keys(musicGraph.switchSetters).filter(n => n.startsWith("music_switch_")).sort();
        this.#select.onchange = () => this.#SteerTo(this.#select.value);
        this.#retryButton.onclick = () => this.#Retry();
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
        if (!this.#app.IsAudioEnabled())
        {
            toggle.checked = false;
            return;
        }
        this.#app.jukeboxUi.Stop();
        const engine = this.#app.audio.musicEngine;
        // Seed the standalone demo with an essential-media branch so its first
        // track is normally already present after acquiring the essential
        // soundbanks. Later UI and showcase setters still steer normally.
        if (this.currentMood === "default")
        {
            const initialEvent = "music_switch_triglavian_space";
            const initialTarget = engine.PreviewSwitchEvent(
                initialEvent,
                this.#dynamicRoot,
            );

            if (initialTarget !== null
                && this.#moodEvents.includes(initialEvent))
            {
                this.moodLabelByTarget.set(
                    initialTarget,
                    "triglavian_space",
                );
                this.musicPlayer.SendEvent(initialEvent);
                this.currentMood = "triglavian_space";
                this.RefreshMoodAvailability();
            }
        }
        const target = engine.PreviewSwitchEvent("", this.#dynamicRoot);
        if (target !== null && !this.moodLabelByTarget.has(target)) this.moodLabelByTarget.set(target, "default");
        this.musicPlayer.SendEvent("music_eve_dynamic_play");
        this.RefreshMoodAvailability();
    }

    /**
     * Availability is STATE-DEPENDENT: a mood's destination depends on the
     * current switch combination, so the dropdown is rebuilt after every
     * change. It drops authored-silence, retired, and MIDI-only destinations
     * which this WebAudio demo cannot render. A mood is offered only when it
     * changes the music, and each destination is offered once. The active mood
     * stays listed as the selected entry.
     */
    RefreshMoodAvailability()
    {
        if (!this.#dynamicRoot || !this.#app.audio?.musicEngine || !this.#select) return;
        const engine = this.#app.audio.musicEngine;
        const current = engine.PreviewSwitchEvent("", this.#dynamicRoot);
        const offered = new Set();
        this.#select.innerHTML = "";
        let activeOption = null;
        for (const name of this.#moodEvents)
        {
            const label = name.slice("music_switch_".length);
            const target = engine.PreviewSwitchEvent(name, this.#dynamicRoot);
            const playable = target !== null
                && this.#app.library.MusicTargetHasPlayableMedia(target);
            const changes = playable
                && target !== current
                && !offered.has(target);
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
        const options = [ ...this.#select?.options ?? [] ].filter(o =>
            !o.disabled
            && o.value
            && o.textContent !== this.currentMood);
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
        const statuses = this.#app.audio?.musicEngine?.GetStatus() ?? [];
        const candidates = statuses.filter(status =>
            status.rootId === this.#dynamicRoot);
        const status = [ ...candidates ].reverse().find(value =>
            !value.stopped)
            ?? candidates.at(-1);

        if (!status)
        {
            this.#hudElement.textContent = this.#app.library.music ? "music: stopped" : "";
            if (this.#retryButton) this.#retryButton.hidden = true;
            return;
        }
        const now = status.now;
        const label = segment => PrettyName(this.moodLabelByTarget.get(segment.targetId) ?? `seg ${segment.segmentId}`);
        const visible = status.segments
            .filter(s => now < (s.fading ? Math.min(s.fadeEndCtx ?? s.endCtx, s.endCtx) : s.endCtx));
        const playing = visible.find(s =>
            !s.fading && s.audibleSources > 0);
        const fadingOut = visible.find(s =>
            s.fading && s.audibleSources > 0);
        const parts = [];

        if (status.state === "stopping")
        {
            parts.push("music: stopping");
        }
        else if (playing) parts.push(`music: ${label(playing)}`);
        else if (fadingOut) parts.push(`music: ${label(fadingOut)} fading out`);
        else if (status.state === "preparing")
        {
            parts.push(`music: ${PrettyName(this.currentMood)} loading…`);
        }
        else if (status.state === "unavailable")
        {
            parts.push(`music: ${PrettyName(this.currentMood)} unavailable (retryable)`);
        }
        else if (status.state === "silent")
        {
            parts.push("music: authored silence for this state");
        }
        else if (status.state === "degraded")
        {
            parts.push(`music: ${PrettyName(this.currentMood)} has no audible clips`);
        }
        else
        {
            parts.push(`music: ${PrettyName(this.currentMood)} scheduled`);
        }
        if (playing && fadingOut)
        {
            const volume = Math.round(Math.max(0, Math.min(1, fadingOut.volume)) * 100);
            parts.push(`· ${label(fadingOut)} fading out ${volume}%`);
        }
        if (status.preparingTargetId) parts.push(`· next: ${PrettyName(this.currentMood)} (loading…)`);
        if (status.unavailableTargetId !== null
            && status.unavailableTargetId !== undefined
            && status.state !== "unavailable")
        {
            const unavailable = this.moodLabelByTarget.get(
                status.unavailableTargetId,
            ) ?? `target ${status.unavailableTargetId}`;
            parts.push(`· ${PrettyName(unavailable)} unavailable (retryable)`);
        }
        if (status.failedSources)
        {
            parts.push(
                `· ${status.failedSources} clip${status.failedSources === 1 ? "" : "s"} unavailable`,
            );
        }
        if (status.missedSources)
        {
            parts.push(
                `· ${status.missedSources} clip${status.missedSources === 1 ? "" : "s"} missed its play window`,
            );
        }
        if (this.#retryButton)
        {
            this.#retryButton.hidden = !(
                status.state === "unavailable"
                || status.state === "degraded"
                || (
                    status.unavailableTargetId !== null
                    && status.unavailableTargetId !== undefined
                )
            );
        }
        this.#hudElement.textContent = parts.join(" ");
    }

    /** Restarts the authored graph at its current switch state. */
    #Retry()
    {
        if (!document.getElementById("musicToggle").checked
            || !this.#app.IsAudioEnabled())
        {
            return;
        }
        this.#retryButton.hidden = true;
        this.SetEnabled(false);
        this.SetEnabled(true);
    }

    #SteerTo(eventName)
    {
        if (!eventName || !this.#app.IsAudioEnabled()) return;
        const engine = this.#app.audio.musicEngine;
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
 * Neutral music-library controls. This talks directly to CjsJukebox and is
 * deliberately separate from the authored Wwise music event/switch graph.
 */
class JukeboxUi
{

    /** @type {DemoApp} */
    #app = null;

    #select = null;

    #status = null;

    #initialized = false;

    constructor(app)
    {
        this.#app = app;
        this.#select = document.getElementById("jukeboxTracks");
        this.#status = document.getElementById("jukeboxStatus");

        const playlist = app.jukeboxLibrary.playlists[0];

        for (const song of playlist.songs)
        {
            const option = document.createElement("option");

            option.value = song.id;
            option.textContent = `${song.id}. ${song.name}`;
            this.#select.appendChild(option);
        }
    }

    /** Attaches controls after CjsAudioMan has realized its browser backend. */
    Initialize()
    {
        if (this.#initialized)
        {
            this.#Refresh(this.#app.audio.jukebox.GetStatus());
            return;
        }

        this.#initialized = true;
        const jukebox = this.#app.audio.jukebox;

        jukebox.SetRepeat("playlist");
        jukebox.SetOnChange(status => this.#Refresh(status));
        document.getElementById("jukeboxPlay").onclick = () =>
            void this.PlaySelected();
        document.getElementById("jukeboxPause").onclick = () =>
        {
            if (!jukebox.Pause())
            {
                jukebox.Resume();
            }
        };
        document.getElementById("jukeboxPrevious").onclick = () =>
            void this.#Run(() => jukebox.Previous());
        document.getElementById("jukeboxNext").onclick = () =>
            void this.#Run(() => jukebox.Next());
        this.#select.onchange = () => void this.PlaySelected();
        this.#Refresh(jukebox.GetStatus());
        void this.#RefreshAvailability();
    }

    /** Plays the selected titled track and stops the authored demo music. */
    PlaySelected()
    {
        if (!this.#app.IsAudioEnabled())
        {
            this.#status.textContent = "enable audio to use the jukebox";
            return Promise.resolve(null);
        }
        if (this.#select.selectedOptions[0]?.disabled)
        {
            this.#status.textContent = "selected track is unavailable";
            return Promise.resolve(null);
        }
        if (document.getElementById("musicToggle").checked)
        {
            this.#app.musicUi.SetEnabled(false);
        }

        return this.#Run(() => this.#app.audio.jukebox.PlaySong(
            this.#select.value,
            { playlistID: "eve-online-in-game-tracks" },
        ));
    }

    /** Stops the neutral player without affecting authored music. */
    Stop()
    {
        this.#app.audio?.jukebox?.Stop();
    }

    async #Run(operation)
    {
        try
        {
            return await operation();
        }
        catch (error)
        {
            this.#status.textContent = error.message;
            return null;
        }
    }

    async #RefreshAvailability()
    {
        this.#status.textContent = "checking downloaded tracks…";
        await this.#app.audio.jukebox.RefreshAvailability(
            "eve-online-in-game-tracks",
        ).catch(() => []);

        for (const option of this.#select.options)
        {
            const availability =
                this.#app.audio.jukebox.GetTrackAvailability(
                    option.value,
                    { playlistID: "eve-online-in-game-tracks" },
                );

            option.disabled = availability === "unavailable";
            option.textContent = option.textContent.replace(
                / \(unavailable\)$/,
                "",
            ) + (option.disabled ? " (unavailable)" : "");
        }

        const available = [ ...this.#select.options ].find(
            option => !option.disabled,
        );

        if (available && this.#select.selectedOptions[0]?.disabled)
        {
            this.#select.value = available.value;
        }
        this.#Refresh(this.#app.audio.jukebox.GetStatus());
    }

    #Refresh(status)
    {
        if (status.song)
        {
            this.#select.value = status.song.id;
        }

        const label = status.song?.name ?? "no track selected";

        this.#status.textContent = status.state === "loading"
            ? `loading: ${label}`
            : `${status.state}: ${label}`;
        document.getElementById("jukeboxPause").textContent =
            status.state === "paused" ? "resume" : "pause";
    }

}


/**
 * Authored SFX laboratory: posts real HIRC graphs repeatedly on the same
 * object and exposes authored setters, branch controls, live RTPC playback,
 * and manager delivery modes.
 */
class SfxUi
{

    /** @type {DemoApp} */
    #app = null;

    /** Dedicated visible scene item retained so Step sequences advance between posts. */
    #item = null;

    #examples = [];
    #controls = null;
    #info = null;
    #details = null;
    #controlValues = new Map();
    #postCount = 0;
    #select = null;
    #status = null;

    constructor(app)
    {
        this.#app = app;
    }

    /** Builds the controls after CjsAudioMan is enabled. */
    Initialize()
    {
        if (this.#select)
        {
            this.#Refresh();
            return;
        }

        this.#examples = this.#app.library.SfxExamples();

        if (!this.#examples.length)
        {
            return;
        }

        document.getElementById("sfx").style.display = "";
        this.#select = document.getElementById("sfxExamples");
        this.#controls = document.getElementById("sfxControls");
        this.#info = document.getElementById("sfxInfo");
        this.#status = document.getElementById("sfxStatus");

        for (const example of this.#examples)
        {
            const option = document.createElement("option");

            option.value = example.eventName;
            option.textContent = `${example.type}: ${example.eventName}`;
            option.dataset.type = example.type;
            this.#select.appendChild(option);
        }

        this.#select.onchange = () =>
        {
            this.Reset();
            this.#BuildControls();
        };
        document.getElementById("sfxPost").onclick = () => this.Post();
        document.getElementById("sfxReset").onclick = () => this.Reset();
        document.getElementById("delivery").onchange = event =>
        {
            this.#app.audio.SetDelivery(event.target.value);
            this.#Refresh();
        };
        this.#BuildControls();
        this.#Refresh();
    }

    /**
     * Posts the selected event on one retained emitter. Repeated sequence
     * posts therefore advance instead of restarting at child zero.
     */
    Post()
    {
        const eventName = this.#select?.value;

        if (!eventName || !this.#app.IsAudioEnabled())
        {
            return;
        }
        if (this.#item && !this.#app.scene.emitters.includes(this.#item))
        {
            this.#item = null;
            this.#postCount = 0;
        }
        if (!this.#item)
        {
            const item = this.#app.scene.SpawnPersistent(
                eventName,
                "authored_sfx_lab",
                [
                    this.#app.scene.listenerPosition[0] + 1800,
                    0,
                    this.#app.scene.listenerPosition[2],
                ],
            );
            if (!item) return;
            item.onRemove = () =>
            {
                if (this.#item !== item) return;
                this.#item = null;
                this.#postCount = 0;
                this.#Refresh();
            };
            this.#item = item;
        }

        this.#ApplyControls();
        this.#item.emitter.SendEvent(eventName);
        this.#postCount++;
        this.#Refresh();
    }

    /** Releases graph state so random pools and Step sequences start over. */
    Reset()
    {
        if (this.#item)
        {
            this.#app.scene.Remove(this.#item, 0);
        }
        this.#postCount = 0;
        this.#Refresh();
    }

    /** Rebuilds the controls exposed by the selected authored graph. */
    #BuildControls()
    {
        if (!this.#controls || !this.#select)
        {
            return;
        }

        this.#controls.replaceChildren();
        this.#controlValues.clear();
        this.#details = this.#app.library.SfxControls(this.#select.value);

        for (const control of this.#details.switches)
        {
            const row = document.createElement("label");
            const select = document.createElement("select");
            const key = `switch:${control.scope}:${control.group}`;

            row.className = "sfxControl";
            row.append(`${control.scope} switch ${control.group}`);
            for (const value of control.values)
            {
                const option = document.createElement("option");

                option.value = value;
                option.textContent = value;
                option.selected = value === control.value;
                select.appendChild(option);
            }
            this.#controlValues.set(key, control.value);
            select.onchange = () =>
            {
                this.#controlValues.set(key, select.value);
                this.#ApplyControls();
                this.#Refresh();
            };
            row.appendChild(select);
            this.#controls.appendChild(row);
        }

        for (const control of this.#details.rtpcs)
        {
            const row = document.createElement("label");
            const line = document.createElement("span");
            const output = document.createElement("output");
            const input = document.createElement("input");
            const key = `rtpc:${control.scope}:${control.name}`;
            const span = control.max - control.min;
            const value = control.min;

            row.className = "sfxControl";
            line.textContent = `${control.scope} RTPC ${control.name}`;
            output.value = FormatControlValue(value);
            line.appendChild(output);
            input.type = "range";
            input.min = String(control.min);
            input.max = String(control.max);
            input.step = String(span > 0 ? span / 400 : 1);
            input.value = String(value);
            input.oninput = () =>
            {
                const next = Number(input.value);

                output.value = FormatControlValue(next);
                this.#controlValues.set(key, next);
                this.#ApplyControls();
                this.#Refresh();
            };
            this.#controlValues.set(key, value);
            row.append(line, input);
            this.#controls.appendChild(row);
        }
    }

    /** Applies the current authored switch/RTPC values to the retained object. */
    #ApplyControls()
    {
        for (const control of this.#details?.switches ?? [])
        {
            const key = `switch:${control.scope}:${control.group}`;
            const value = this.#controlValues.get(key);

            if (control.scope === "state")
            {
                this.#app.audio.SetState(control.group, value);
            }
            else
            {
                this.#item?.emitter.SetSwitch(control.group, value);
            }
        }
        for (const control of this.#details?.rtpcs ?? [])
        {
            const key = `rtpc:${control.scope}:${control.name}`;
            const value = this.#controlValues.get(key);

            if (control.scope === "global")
            {
                this.#app.audio.SetGlobalRTPC(control.name, value);
            }
            else
            {
                this.#item?.emitter.SetRTPC(control.name, value);
            }
        }
    }

    #Refresh()
    {
        if (!this.#status || !this.#select)
        {
            return;
        }

        const eventName = this.#select.value;
        const example = this.#examples.find(value =>
            value.eventName === eventName);
        const graphTypes = this.#app.library.SfxNodeTypes(eventName);
        const details = this.#app.library.SfxControls(eventName);

        const types = graphTypes
            .filter(type => type !== "sound");
        if (!types.length && graphTypes.includes("sound"))
        {
            types.push("sound");
        }
        if (!types.length)
        {
            types.push(details.actions.some(action =>
                action.kind === "set-voice-volume"
                || action.kind === "reset-voice-volume")
                ? "voice volume action"
                : details.actions.some(action =>
                    action.kind === "stop")
                    ? "stop action"
                    : "setter");
        }
        const graph = this.#app.library.sfx;
        const delivery = document.getElementById("delivery").value;
        const repeated = types.includes("sequence")
            ? " · repeat to advance the Step sequence"
            : types.includes("random")
                ? " · repeat to hear authored random selection"
                : types.includes("parallel")
                    ? " · one post resolves simultaneous layer voices"
                    : types.includes("blend")
                        ? " · move the RTPC while playing or post at a new value"
                        : types.includes("switch")
                            ? " · choose an authored branch before posting"
                            : "";
        const actionSummary = details.program.length
            ? ` · ordered program: ${details.program.map(action =>
                FormatSfxProgramAction(action)).join(" → ")}`
            : "";
        const playable = this.#app.library.PlayableCandidates(eventName).length;
        const silent = playable
            ? ""
            : " · no playable root (the authored route is silent)";

        const position = this.#item
            ? " · purple source is draggable; hollow means idle"
            : " · Post creates a draggable purple source";
        const eventCount = new Set([
            ...Object.keys(graph.events),
            ...Object.keys(graph.programs ?? {}),
        ]).size;
        const detail = `${eventCount} events / ${Object.keys(graph.nodes).length} nodes · ${types.join(" + ")} · ${delivery} delivery · posts ${this.#postCount}${repeated}${actionSummary}${silent}${position}`;
        const description = example?.description
            ?? "Posts the selected authored SFX graph.";

        if (this.#info)
        {
            this.#info.dataset.tip = `${description}\n\n${detail}`;
            this.#info.setAttribute(
                "aria-label",
                `About ${example?.type ?? "the selected authored SFX"}: ${description} ${detail}`,
            );
        }
        this.#status.textContent = `${this.#postCount} post${this.#postCount === 1 ? "" : "s"} · ${delivery} delivery${playable ? "" : " · silent authored route"}${this.#item ? " · source placed" : ""}`;
    }

}

function FormatControlValue(value)
{
    return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 3,
    });
}

function FormatRtpcProperty(value)
{
    if (value === "initialDelay")
    {
        return "initial delay";
    }
    return value;
}

function FormatSfxProgramAction(action)
{
    if (action.kind === "switch" || action.kind === "state")
    {
        return `${action.kind} ${action.group}=${action.value}`;
    }
    if (action.kind === "play")
    {
        return `play ${action.child?.nodeId ?? ""}`.trim();
    }
    if (action.kind === "set-voice-volume"
        || action.kind === "reset-voice-volume")
    {
        const delay = Number(action.delayMs) > 0
            ? ` after ${FormatControlValue(action.delayMs)}ms`
            : "";
        const transition = Number(action.transitionMs) > 0
            ? ` over ${FormatControlValue(action.transitionMs)}ms`
            : "";
        const verb = action.kind === "reset-voice-volume"
            ? "reset voice volume"
            : `${action.valueMode} voice volume ${FormatControlValue(action.volumeDb)}dB`;

        return `${verb} on ${action.targetId} (${action.scope}${delay}${transition})`;
    }
    if (action.kind !== "stop")
    {
        return String(action.kind);
    }

    const target = action.mode === "element"
        ? `element ${action.targetId}`
        : action.mode === "all-except"
            ? `all except ${action.exceptions?.length ?? 0}`
            : "all";
    const delay = Number(action.delayMs) > 0
        ? ` after ${FormatControlValue(action.delayMs)}ms`
        : "";
    const transition = Number(action.transitionMs) > 0
        ? ` over ${FormatControlValue(action.transitionMs)}ms`
        : "";

    return `stop ${target} (${action.scope}${delay}${transition})`;
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

        // The scene: ONE large ring of exact authored ambience loops beyond
        // the hearing range (~3000). Prefer hangar/station families for the
        // showcase, but require a graph Sound leaf explicitly marked as
        // infinite rather than inferring playback behavior from an event name.
        // From the center you barely hear them; drag the listener toward a
        // hangar to walk into its soundscape. Anchors double as spawn points
        // for the activity around them.
        const anchors = [];
        const ambienceRank = (name) =>
        {
            if (/(?:hangar|osse|repair_drone)/i.test(name)) return 0;
            if (/(?:ambience|atmo|outpost|loops|platform)/i.test(name)) return 1;
            return 2;
        };
        const sceneLoops = library.eventNames
            .filter(name => library.EventHasSelfContainedLoop(name))
            .sort((left, right) =>
                ambienceRank(left)
                - ambienceRank(right)
                || left.localeCompare(right))
            .slice(0, 13);
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
        const artillery = pickFrom(/^play_outburst_artillery_(L|M)_multi_begin$/);
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

    /** @type {CjsAudioMan} */
    audio = null;

    /** The manager-owned low-level graph/backend system. */
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

    /** @type {JukeboxUi} */
    jukeboxUi = null;

    /** The separate optional titled-track catalog. */
    jukeboxLibrary = null;

    /** @type {SfxUi} */
    sfxUi = null;

    /** @type {Showcase} */
    showcase = null;

    /** @type {EffectListPanel} */
    effectList = null;

    frame = 0;

    lastFrameTime = null;

    #frameStarted = false;

    constructor(library, jukeboxLibrary)
    {
        this.library = library;
        this.jukeboxLibrary = jukeboxLibrary;
        this.media = new MediaSource();
        this.scene = new Scene(this);
        this.stage = new Stage(this);
        this.musicUi = new MusicUi(this);
        this.jukeboxUi = new JukeboxUi(this);
        this.sfxUi = new SfxUi(this);
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
        if (!this.audio)
        {
            this.audio = new CjsAudioMan(this.library.raw, {
                distanceScale: ACOUSTIC_SCALE,
                createContext: () => this.media.CreateContext(),
                mediaProvider: this.media,
                // Keep the authored music graph deterministic in this demo so
                // its seeded Triglavian state always begins with the verified
                // 257897633 WEM. SFX retains its independent random source.
                createMusicEngine: options => new CjsMusicEngine({
                    ...options,
                    random: () => 0,
                }),
                musicLibrary: this.jukeboxLibrary,
                loadMusicTrack: (song, context) =>
                    this.media.ReadMusicTrack(song, context),
                isMusicTrackAvailable: (song, context) =>
                    this.media.IsMusicTrackAvailable(song, context),
            });
            this.system = this.audio.system;
            this.scene.listenerObject = this.audio.listener;
            this.scene.MoveListenerTo(this.scene.listenerPosition);
        }
        if (this.audio.GetState() === 2)
        {
            return;
        }

        // Enable with the full catalog: the ported engine gates PostEvent on
        // bank status, and the catalog-route backend completes loads
        // immediately.
        if (!this.audio.Enable(Object.keys(this.library.metadata.SoundBanks)))
        {
            document.getElementById("enable").checked = false;
            return;
        }
        this.media.ResumeContext();
        if (this.library.music) this.musicUi.Initialize();
        this.jukeboxUi.Initialize();
        if (this.library.sfx) this.sfxUi.Initialize();
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
        window.__demo = {
            audio: this.audio,
            system: this.system,
            emitters: this.scene.emitters,
            library: this.library.raw,
            jukebox: this.audio.jukebox,
            musicLibrary: this.jukeboxLibrary,
        };
        if (!this.#frameStarted)
        {
            this.#frameStarted = true;
            requestAnimationFrame(now => this.#Tick(now));
        }
    }

    /** True only while event posts can be realized immediately. */
    IsAudioEnabled()
    {
        return this.audio?.GetState() === 2;
    }

    LoadShowcase()
    {
        if (!this.audio || this.audio.GetState() !== 2) this.EnableAudio();
        if (!this.IsAudioEnabled())
        {
            document.getElementById("demoToggle").checked = false;
            return;
        }
        this.showcase.Start();
    }

    /**
     * Unchecking "audio" silences everything: stop the showcase, remove
     * every emitter, stop the music. The system stays constructed - checking
     * the box again resumes an empty, ready scene.
     */
    DisableAudio()
    {
        if (!this.audio) return;
        this.StopAll();
        this.sfxUi.Reset();
        if (this.musicUi.musicPlayer) this.musicUi.SetEnabled(false);
        this.audio.Disable();
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
        this.audio.SetGlobalRTPC("menu_main_music_level", Number(document.getElementById("musicVol").value) / 100);
        this.audio.backend?.SetSfxVolume(Number(document.getElementById("sfxVol").value) / 100);
    }

    #Tick(now)
    {
        this.system.manager.soundPrioritization.SetMaxAwakeGameObjects(Number(document.getElementById("maxAwake").value));
        this.system.Process({
            time: now / 1000,
            realTime: now / 1000,
            deltaTime: this.lastFrameTime === null
                ? 0
                : (now - this.lastFrameTime) / 1000,
            frame: ++this.frame,
        });
        this.lastFrameTime = now;
        this.scene.AdvanceSequences(now);
        this.scene.PruneFinished(now);
        this.stage.Draw();
        this.musicUi.UpdateHud();
        requestAnimationFrame(next => this.#Tick(next));
    }

}


const [ audioLibrary, jukeboxLibrary ] = await Promise.all([
    AudioLibrary.Load(),
    JukeboxLibrary.Load(),
]);

new DemoApp(audioLibrary, jukeboxLibrary);
