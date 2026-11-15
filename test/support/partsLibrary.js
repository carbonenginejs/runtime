// TEST HELPER, not a runtime API.
//
// A real parts library (CjsCharacterLibraryManager) over a synthetic build: Carbon's BluePaths over a remote index of
// the given files, and a resMan whose source answers each file's text. A paper doll source then lists and reads
// through the library's queries, as in a host, and a `.prs` reads through the character factory's recipe reader. A `.type` without its own text names the folder its `types/` folder
// sits in, the variation its name ends in (`_v1`), and no colour variant. Methods a test needs to answer itself (a
// recipe, a palette's colours, a decode) are set on the library it returns.
import { CjsCharacterFactory, CjsCharacterLibraryManager } from "../../npm/dist/character/index.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../npm/dist/blue/index.js";
import { installBlueServices } from "../../npm/dist/blue/blue.js";
import { CjsBlackFormat } from "../../npm/dist/blue/formats/black/index.js";
import "./frameLoop.js";

/** A `.color` file's text, with every colour the given grey. */
export const COLOR = (value = 0.5) => `colors: [!!python/tuple [${value},${value},${value},1], !!python/tuple [${value},${value},${value},1], !!python/tuple [${value},${value},${value},1]]\npattern: ''\npatternColors: [!!python/tuple [0.2,0.2,0.2,1.0], !!python/tuple [0.6,0.6,0.6,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0,0,8,8], 0.0]\n`;

/**
 * Installs Blue's paths, resMan and a parts library over a synthetic build for one test.
 * @param {import("node:test").TestContext} t The test, whose end restores the services.
 * @param {string} root The paper doll root the files sit under (`res:/graphics/character/<sex>/paperdoll/`).
 * @param {string[]} files Every file of the build, as full `res:` paths.
 * @param {{ text?: Object<string, string|Uint8Array>, overrides?: Object<string, function> }} [options] File texts by
 *   path, or bytes for a binary file (a `.type` and a `.color` have defaults; any other read file needs one), and
 *   library methods to replace.
 * @returns {{ library: CjsCharacterLibraryManager, paths: BluePaths, reads: string[] }}
 */
export function installPartsLibrary(t, root, files, { text = {}, overrides = {} } = {})
{
    const cache = new RemoteFileCache();
    cache.AddFileIndex(files.map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const reads = [];
    const contentOf = path =>
    {
        if (Object.hasOwn(text, path)) return text[path];
        if (path.endsWith(".type"))
        {
            const name = path.slice(path.lastIndexOf("/") + 1, -".type".length), variation = /_(v\d+)$/u.exec(name)?.[1] ?? "";
            return `!!python/tuple [${path.slice(root.length, path.lastIndexOf("/types/"))}, '${variation}', '']\n`;
        }
        if (path.endsWith(".color")) return COLOR();
        throw new Error("The synthetic build has no text for " + path);
    };
    const resMan = new BlueResMan({ source: { Read(path)
    {
        reads.push(path);
        const content = contentOf(path);
        return typeof content === "string" ? new TextEncoder().encode(content) : content;
    } } });
    const library = new CjsCharacterLibraryManager();
    Object.assign(library, overrides);
    const previous = installBlueServices({ paths, resMan, characterLibrary: library }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    // The object files the library builds through LoadObject, registered as the composition root does (core/configuration.js).
    resMan.RegisterObjectBuilder("black", CjsBlackFormat.createBlackObjectBuilder);
    library.Initialize({ resMan });
    CjsCharacterFactory.registerObjectBuilders(resMan);
    return { library, paths, reads };
}
