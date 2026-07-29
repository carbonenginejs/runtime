import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsAudioLibraryBuilder,
} from "@carbonenginejs/runtime-audio/library-builder";
import {
    CjsAudioLibrary,
} from "../src/audio/index.js";
import {
    CjsFileIndex,
    CjsFileIndexLibrary,
} from "../src/fileindex/index.js";

const SOUNDBANKS_INFO = {
    SoundBanksInfo: {
        SoundBanks: [
            {
                Id: "524",
                ShortName: "ships",
                Path: "SoundBanks\\ships.bnk",
                Events: [
                    {
                        Id: "11",
                        Name: "engine_loop",
                    },
                ],
            },
        ],
    },
};

function CreateFileIndexLibrary()
{
    return new CjsFileIndexLibrary({
        provider: {
            id: "test",
            game: "Test",
            defaultBuildRef: "1",
            clients: {},
            remote: {
                metadataBaseURL: "https://audio.test/metadata",
                indexBaseURL: "https://audio.test/index",
                appBaseURL: "https://audio.test/app",
                resBaseURL: "https://audio.test/res",
            },
        },
        buildReference: {
            build: "1",
        },
        appIndex: CjsFileIndex.parseAppFileIndex(
            "app:/resfileindex.txt,index.txt",
        ),
        resFileIndexes: [
            {
                name: "main",
                declaration: null,
                sourceID: null,
                index: CjsFileIndex.parseResFileIndex([
                    "res:/audio/524.bnk,banks/524.bnk,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,12",
                    "res:/audio/777.wem,media/777.wem,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,4",
                    "res:/graphics/example.red,graphics/example.red,cccccccccccccccccccccccccccccccc,1",
                ].join("\n")),
            },
        ],
    });
}

function CreateFetch(values, calls)
{
    return async (url, options = {}) =>
    {
        calls.push({
            url,
            range: new Headers(options.headers).get("Range"),
        });

        const value = values[url];

        if (value === undefined)
        {
            return {
                ok: false,
                status: 404,
                arrayBuffer: async () => new ArrayBuffer(0),
            };
        }

        const range = new Headers(options.headers).get("Range");
        const bytes = value instanceof Uint8Array
            ? value
            : new TextEncoder().encode(
                typeof value === "string" ? value : JSON.stringify(value),
            );
        let selected = bytes;
        let status = 200;

        if (range)
        {
            const match = /^bytes=(\d+)-(\d+)$/u.exec(range);
            selected = bytes.slice(Number(match[1]), Number(match[2]) + 1);
            status = 206;
        }

        return {
            ok: true,
            status,
            headers: new Headers({
                "content-type": "application/octet-stream",
            }),
            arrayBuffer: async () => selected.slice().buffer,
        };
    };
}

test("remote audio client returns caller-owned builder inputs", async () =>
{
    const fileIndex = CreateFileIndexLibrary();
    const calls = [];
    const client = new CjsAudioLibrary({
        fileIndex,
        fetch: CreateFetch({
            "https://audio.test/soundbanks.json": SOUNDBANKS_INFO,
            "https://audio.test/enrichment.json": {
                Events: {
                    engine_loop: {
                        isLoop: 1,
                    },
                },
            },
        }, calls),
    });
    const inputs = await client.GetBuilderInputs({
        soundbanksInfo: "https://audio.test/soundbanks.json",
        enrichment: "https://audio.test/enrichment.json",
    });
    const document = CjsAudioLibraryBuilder.build(inputs);

    assert.equal(inputs.indexEntries.length, 2);
    assert.equal(document.metadata.Events.engine_loop.isLoop, 1);
    assert.equal(document.media["777"].storagePath, "media/777.wem");
    assert.equal(document.banks["524:0"].storagePath, "banks/524.bnk");
    assert.equal(calls.length, 2);
});

test("remote audio client loads and validates a complete document", async () =>
{
    const document = CjsAudioLibraryBuilder.build({
        indexEntries: [],
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [],
            },
        },
    });
    const calls = [];
    const client = new CjsAudioLibrary({
        fetch: CreateFetch({
            "https://audio.test/library.json": document,
        }, calls),
    });
    const installed = await client.ReadDocument(
        "https://audio.test/library.json",
    );

    assert.deepEqual(installed, document);
    assert.equal(Object.isFrozen(installed), true);
});

test("remote audio provider resolves individual files through fileindex", async () =>
{
    const calls = [];
    const client = new CjsAudioLibrary({
        fileIndex: CreateFileIndexLibrary(),
        fetch: CreateFetch({
            "https://audio.test/res/media/777.wem":
                new Uint8Array([ 1, 2, 3, 4 ]),
        }, calls),
    });
    const result = await client.Read({
        resPath: "res:/audio/777.wem",
    });

    assert.deepEqual([ ...new Uint8Array(result.bytes) ], [ 1, 2, 3, 4 ]);
    assert.equal(calls[0].range, null);
});

test("remote audio provider requests exact original-bank ranges", async () =>
{
    const calls = [];
    const client = new CjsAudioLibrary({
        fileIndex: CreateFileIndexLibrary(),
        fetch: CreateFetch({
            "https://audio.test/res/banks/524.bnk":
                new Uint8Array([ 0, 1, 2, 3, 4, 5, 6, 7 ]),
        }, calls),
    });
    const result = await client.ReadRange({
        resPath: "res:/audio/524.bnk",
    }, {
        offset: 2,
        byteLength: 4,
    });

    assert.deepEqual([ ...new Uint8Array(result.bytes) ], [ 2, 3, 4, 5 ]);
    assert.equal(result.complete, false);
    assert.equal(calls[0].range, "bytes=2-5");
});
