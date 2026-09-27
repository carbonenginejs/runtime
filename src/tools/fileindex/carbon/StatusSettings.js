// Source: resources/src/StatusSettings.h
// Source: resources/src/StatusSettings.cpp
//
// Progress reporting in nested scopes: a scope reports to the callback, and a
// nested scope's progress is scaled into its parent's share of the job.
//
// Adapted: Carbon ends a scope in its destructor. JavaScript has none, so a
// caller ends one with `Dispose()`, in a `finally`.
import { CjsSchema, carbon, impl } from "#schema";
import { CallbackSettings } from "./CallbackSettings.js";
import { StatusProgressType } from "./enums.js";
import { StatusReturn } from "./StatusReturn.js";
import { StatusUpdate } from "./StatusUpdate.js";

/** `CarbonResources::StatusSettings` - one progress-reporting scope. */
export class StatusSettings
{
    /** @type {StatusSettings|null} */
    m_parent = null;

    m_nestingLevel = 0;

    m_callbackSettings = new CallbackSettings();

    m_lastUpdate = new StatusUpdate();

    /** `SetCallbackSettings` - copies the settings, as Carbon assigns the struct (StatusSettings.cpp:22-25). */
    SetCallbackSettings(callbackSettings)
    {
        this.m_callbackSettings = StatusSettings._Copy(callbackSettings);
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
        return Boolean(this.m_callbackSettings.statusCallback)
            && (this.m_nestingLevel <= this.m_callbackSettings.verbosityLevel || this.m_callbackSettings.verbosityLevel === -1);
    }

    /**
     * `Update` (StatusSettings.cpp:27-58): records and reports an update, and
     * starts a nested scope when one is given. Progress values are float32.
     */
    Update(statusProgressType, progress, percentageSizeOfJob, info, nestedStatusSettingsOut = null)
    {
        const settings = this.m_callbackSettings;
        if (!settings.statusCallback) return;
        if (this.m_nestingLevel >= settings.verbosityLevel && settings.verbosityLevel !== -1) return;

        this.m_lastUpdate.statusProgressType = statusProgressType;
        this.m_lastUpdate.progress = Math.fround(progress);
        this.m_lastUpdate.percentageSizeOfJob = Math.fround(percentageSizeOfJob);
        this.m_lastUpdate.info = info;

        const scaled = this.CalculateOverallProgress();
        settings.statusCallback(statusProgressType, this.m_lastUpdate.progress, scaled.progress, this.m_lastUpdate.percentageSizeOfJob, this.m_nestingLevel, info);

        if (nestedStatusSettingsOut)
        {
            nestedStatusSettingsOut.m_parent = this;
            nestedStatusSettingsOut.m_callbackSettings = StatusSettings._Copy(settings);
            nestedStatusSettingsOut.m_nestingLevel = this.m_nestingLevel + 1;
            nestedStatusSettingsOut.Update(StatusProgressType.START, 0, 0, "Starting Process");
        }
    }

    /** `CalculateOverallProgress` (StatusSettings.cpp:67-93): this scope's progress scaled through its parents. */
    CalculateOverallProgress()
    {
        const own = this.m_lastUpdate;
        if (!this.m_parent) return new StatusReturn(own.progress, own.percentageSizeOfJob / 100);
        const parent = this.m_parent.CalculateOverallProgress();
        const scaledProgress = Math.fround(own.progress * parent.scale);
        const scaledScale = Math.fround((own.percentageSizeOfJob / 100) * parent.scale);
        return new StatusReturn(parent.progress + scaledProgress, scaledScale);
    }

    /** Carbon's destructor (StatusSettings.cpp:15-21): reports the end unless progress reached 100. */
    Dispose()
    {
        if (this.m_lastUpdate.progress < 100) this.Update(StatusProgressType.END, 100, 0, "Process complete.");
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

CjsSchema.define(StatusSettings, {
    className: "StatusSettings",
    carbon: "StatusSettings",
    family: "tools",
    fields: {},
    methods: {
        SetCallbackSettings: [ carbon.method, impl.implemented ],
        RequiresStatusUpdates: [ carbon.method, impl.implemented ],
        Update: [ carbon.method, impl.implemented ],
        CalculateOverallProgress: [ carbon.method, impl.implemented ],
        Dispose: [ impl.adapted ],
        _Copy: [ impl.custom ]
    }
});
