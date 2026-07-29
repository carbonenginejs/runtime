import assert from "node:assert/strict";
import test from "node:test";

import {
    installAudioLibraryDocument,
    validateAudioLibraryDocument,
} from "../npm/dist/library/index.js";

function CreateDocument()
{
    return {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                engine_loop: {
                    eventID: 11,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 1,
                    isVital: 0,
                    maxRadiusAttenuation: 100,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {
                "777": {
                    SoundBank: "ships.bnk",
                },
            },
        },
        media: {
            "777": {
                sourceID: "loose:777",
                resPath: "res:/audio/777.wem",
                mediaType: "wem",
            },
        },
        banks: {
            "524:0": {
                sourceID: "524:0",
                bankID: "524",
                languageID: "0",
                resPath: "res:/audio/524.bnk",
            },
        },
        eventMedia: {
            engine_loop: [ "777" ],
        },
        eventMediaLanguage: "",
    };
}

test("validates and installs one detached immutable audio-library document", () =>
{
    const source = CreateDocument();
    const installed = installAudioLibraryDocument(source);

    assert.equal(validateAudioLibraryDocument(source), true);
    assert.notEqual(installed, source);
    assert.notEqual(installed.metadata, source.metadata);
    assert.equal(Object.isFrozen(installed), true);
    assert.equal(Object.isFrozen(installed.metadata.Events), true);
    assert.throws(() =>
    {
        installed.metadata.Events.engine_loop.isLoop = 0;
    }, TypeError);
});

test("rejects missing media references and non-JSON installed values", () =>
{
    const missing = CreateDocument();

    missing.eventMedia.engine_loop = [ "999" ];

    assert.throws(
        () => validateAudioLibraryDocument(missing),
        /references missing source 999/u,
    );

    const invalid = CreateDocument();

    invalid.metadata.Events.engine_loop.value = Number.NaN;

    assert.throws(
        () => installAudioLibraryDocument(invalid),
        /contains a non-finite number/u,
    );
});

test("rejects the retired v1 document shape", () =>
{
    const legacy = CreateDocument();

    legacy.schemaVersion = 1;

    assert.throws(
        () => validateAudioLibraryDocument(legacy),
        /Unsupported audio-library schema version: 1/u,
    );
});
