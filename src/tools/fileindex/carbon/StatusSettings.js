// Source: resources/src/StatusSettings.h
// Source: resources/src/StatusSettings.cpp
//
// Progress reporting in nested scopes: a scope reports to the callback, and a
// nested scope's progress is scaled into its parent's share of the job.
//
// Adapted: Carbon ends a scope in its destructor. JavaScript has none, so a
// caller ends one with `Dispose()`, in a `finally`.
import { CjsSchema, meta, blue } from "#schema";
import { CallbackSettings } from "./CallbackSettings.js";
import { StatusProgressType } from "./enums.js";
import { StatusReturn } from "./StatusReturn.js";
import { StatusUpdate } from "./StatusUpdate.js";

/** `CarbonResources::StatusSettings` - one progress-reporting scope. */
export class StatusSettings
{
    /** @type {StatusSettings|null} */
    _parent = null;

    _nestingLevel = 0;

    _callbackSettings = new CallbackSettings();

    _lastUpdate = new StatusUpdate();

    /** `SetCallbackSettings` - copies the settings, as Carbon assigns the struct (StatusSettings.cpp:22-25). */
    SetCallbackSettings(callbackSettings)
    {
        this._callbackSettings = StatusSettings._Copy(callbackSettings);
    }

    /**
     * `RequiresStatusUpdates` (StatusSettings.cpp:60-65): a callback is set,
     * and this level is at or inside the verbosity level, or every level
     * reports.
     *
     * Quirk, reproduced: this tests `nesting <= verbosity` while Update skips
     * `nesting >= verbosity`, so at exactly the verbosity level a scope says it
     * wants updates and then reports none.
     */
    RequiresStatusUpdates()
    {
        return Boolean(this._callbackSettings.statusCallback)
            && (this._nestingLevel <= this._callbackSettings.verbosityLevel || this._callbackSettings.verbosityLevel === -1);
    }

    /**
     * `Update` (StatusSettings.cpp:27-58): records and reports an update, and
     * starts a nested scope when one is given. Progress values are float32.
     */
    Update(statusProgressType, progress, percentageSizeOfJob, info, nestedStatusSettingsOut = null)
    {
        const settings = this._callbackSettings;
        if (!settings.statusCallback) return;
        if (this._nestingLevel >= settings.verbosityLevel && settings.verbosityLevel !== -1) return;

        this._lastUpdate.statusProgressType = statusProgressType;
        this._lastUpdate.progress = Math.fround(progress);
        this._lastUpdate.percentageSizeOfJob = Math.fround(percentageSizeOfJob);
        this._lastUpdate.info = info;

        const scaled = this.CalculateOverallProgress();
        settings.statusCallback(statusProgressType, this._lastUpdate.progress, scaled.progress, this._lastUpdate.percentageSizeOfJob, this._nestingLevel, info);

        if (nestedStatusSettingsOut)
        {
            nestedStatusSettingsOut._parent = this;
            nestedStatusSettingsOut._callbackSettings = StatusSettings._Copy(settings);
            nestedStatusSettingsOut._nestingLevel = this._nestingLevel + 1;
            nestedStatusSettingsOut.Update(StatusProgressType.START, 0, 0, "Starting Process");
        }
    }

    /** `CalculateOverallProgress` (StatusSettings.cpp:67-93): this scope's progress scaled through its parents. */
    CalculateOverallProgress()
    {
        const own = this._lastUpdate;
        if (!this._parent) return new StatusReturn(own.progress, own.percentageSizeOfJob / 100);
        const parent = this._parent.CalculateOverallProgress();
        const scaledProgress = Math.fround(own.progress * parent.scale);
        const scaledScale = Math.fround((own.percentageSizeOfJob / 100) * parent.scale);
        return new StatusReturn(parent.progress + scaledProgress, scaledScale);
    }

    /** Carbon's destructor (StatusSettings.cpp:15-21): reports the end unless progress reached 100. */
    Dispose()
    {
        if (this._lastUpdate.progress < 100) this.Update(StatusProgressType.END, 100, 0, "Process complete.");
    }

    /** A struct copy of callback settings, as C++ assignment makes. */
    static _Copy(callbackSettings)
    {
        const copy = new CallbackSettings();
        copy.statusCallback = callbackSettings.statusCallback;
        copy.verbosityLevel = callbackSettings.verbosityLevel;
        return copy;
    }
}

CjsSchema.blue.define(StatusSettings, {
  className: "StatusSettings",
  fields: {},
  methods: {
        SetCallbackSettings: [ blue.method, meta.implemented ],
        RequiresStatusUpdates: [ blue.method, meta.implemented ],
        Update: [ blue.method, meta.implemented ],
        CalculateOverallProgress: [ blue.method, meta.implemented ],
        Dispose: [ meta.adapted ],
        _Copy: []
    }
});
