// The SOF library builder drops nothing, over a real build (format-ownership.md § Readers and factories drop
// nothing; operator, 2026-11-12).
//
// The builder fetches one .black record per hull, faction, race, material, pattern and layout, publishes it to
// the data manager and keeps it in its catalog. The catalog's values are the library a tool saves and a client
// loads. For a fixed sample of each kind, three things are checked:
//   1. the record the catalog holds says what a fresh read of the same file says, so the builder changed nothing;
//   2. the catalog's saved values, loaded into a second builder and saved again, are the same values, so the
//      library keeps everything it was given;
//   3. nothing is logged at warning level while a record is fetched, unless DROPS lists it with its proof.
// That every attribute of a .black file reaches a member is black-drops-nothing-corpus.test.js's subject.
//
// Game files are never committed (org rule). The files come from the tools-core service by res:/ path; the test
// skips when it is not running (CJS_TOOLS_SERVER, default http://127.0.0.1:5510). It follows the build the service
// calls latest; set CJS_CLIENT_BUILD to repeat a run on one build. Records are read without Initialize.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clientResources } from "../../support/clientResources.js";
import { ImportAllDistModules } from "../../support/allDistClasses.js";
import { readBlack } from "../../support/blackReader.js";
import { CjsSofLibraryBuilder, EveSOFDataMgr } from "../../../npm/dist/sof/index.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import { CcpLog } from "../../../npm/dist/global/index.js";

const ROOT = "res:/dx9/model/spaceobjectfactory/";

/** How many records of each kind are read: every Nth path in sorted order. Layouts and races are all read. */
const SAMPLE = { hull: 120, material: 150, faction: 40, pattern: 100, layout: 100, race: 100 };

const KINDS = {
  hull: { directory: "hulls", fetch: "FetchHull" },
  material: { directory: "materials", fetch: "FetchMaterial" },
  faction: { directory: "factions", fetch: "FetchFaction" },
  pattern: { directory: "patterns", fetch: "FetchPattern" },
  layout: { directory: "layouts", fetch: "FetchLayout" },
  race: { directory: "races", fetch: "FetchRace" }
};

/**
 * What may differ or be logged and still pass, each with its proof. Empty: nothing is dropped.
 * @type {Object<string, string>}
 */
const DROPS = {};

/** Log lines that say nothing about a record's content: this test registers no resource factories. */
const NOT_THE_FILE = [ "No factory found for extension (" ];

const resources = await clientResources();

/** A fixed sample of sorted paths: every Nth, at most `count`. */
const Sample = (paths, count) => paths.length <= count ? paths : Array.from({ length: count }, (_, i) => paths[Math.floor(i * paths.length / count)]);

/** The first place two plain values differ, or null. */
function FirstDifference(a, b, path = "")
{
  if (a === b || (a !== a && b !== b)) return null;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return `${path}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`;
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) return JSON.stringify(Array.from(a)) === JSON.stringify(Array.from(b)) ? null : `${path}: typed values differ`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: one is a list`;
  const keys = new Set([ ...Object.keys(a), ...Object.keys(b) ]);
  for (const key of keys)
  {
    if (!(key in a)) return `${path}.${key}: only in the second`;
    if (!(key in b)) return `${path}.${key}: only in the first`;
    const difference = FirstDifference(a[key], b[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return null;
}

test("the SOF library builder keeps every record of a sample of the build as its file states it", { skip: resources.skip ?? false }, async t =>
{
  await ImportAllDistModules();
  const all = resources.Paths(".black").filter(path => path.startsWith(ROOT));

  const logged = [];
  const sink = (_channel, _type, _userData, message) => logged.push(message);
  CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
  CcpLog.RegisterLogEcho(sink, CcpLog.LogType.LOGTYPE_WARN);
  t.after(() =>
  {
    CcpLog.UnregisterLogEcho(sink);
    CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
  });

  const bytes = new Map();
  const source = async path =>
  {
    const key = path.toLowerCase();
    if (!bytes.has(key)) bytes.set(key, await resources.Read(key));
    return readBlack(bytes.get(key), { initialize: false });
  };
  const builder = new CjsSofLibraryBuilder({ dataMgr: new EveSOFDataMgr(), source, exists: path => resources.cache.FileExists(path) });
  await builder.InitializeAsync();

  const findings = new Map();
  const report = (message, path) =>
  {
    const key = message.replaceAll(path, "<file>");
    if (Object.hasOwn(DROPS, key)) return;
    const finding = findings.get(key) ?? { count: 0, example: path };
    finding.count++;
    findings.set(key, finding);
  };

  const counts = {};
  const unavailable = [];
  for (const [ kind, { directory, fetch } ] of Object.entries(KINDS))
  {
    const paths = Sample(all.filter(path => path.startsWith(ROOT + directory + "/")), SAMPLE[kind]);
    assert.ok(paths.length > 0, `the build ships ${kind} records`);
    counts[kind] = 0;
    for (const path of paths)
    {
      logged.length = 0;
      let record;
      try { record = await builder[fetch](path); }
      catch (error)
      {
        if (/could not be downloaded|Couldn't download/u.test(error.message)) unavailable.push(path);
        else report(`${error.name}: ${error.message}`, path);
        continue;
      }
      if (record === null) { report("the builder gave no record", path); continue; }
      counts[kind]++;
      const fresh = readBlack(bytes.get(path), { initialize: false });
      const difference = FirstDifference(CjsSchema.getValues(fresh), CjsSchema.getValues(record), kind);
      if (difference) report(`the catalog's record differs from its file at ${difference}`, path);
      for (const message of logged) if (!NOT_THE_FILE.some(start => message.startsWith(start))) report(`logged: ${message}`, path);
    }
  }

  // The library a tool saves: build its objects again from the saved values, as a client does (SetData takes a
  // hydrated EveSOFData graph, EveSOFDataMgr.cpp:514-589), load them into a second builder and save it again.
  // typeTags writes an item's class where its slot declares only an interface (a hull's locatorSets list holds
  // IEveSOFDataHullLocatorSet); values saved without it cannot build that item again.
  const saved = builder.GetValues({ typeTags: true });
  const second = new CjsSofLibraryBuilder({
    dataMgr: new EveSOFDataMgr(),
    source: path => Promise.reject(new Error(`${path}: the saved library must need no file`)),
    data: CjsSchema.from("EveSOFData", saved)
  });
  const difference = FirstDifference(saved, second.GetValues({ typeTags: true }), "library");
  if (difference) report(`the saved library does not survive a reload at ${difference}`, "the library");

  t.diagnostic(`build ${resources.build}: ${Object.entries(counts).map(([ kind, count ]) => `${count} ${kind}`).join(", ")} records, with what each faction and the generic record name`);
  if (unavailable.length) t.diagnostic(`${unavailable.length} sampled file(s) could not be downloaded, e.g. ${unavailable[0]}`);
  assert.deepEqual(
    [ ...findings ].map(([ message, { count, example } ]) => `${count} record(s), e.g. ${example}: ${message}`),
    [],
    "every record reaches the library as its file states it, or DROPS lists it with its proof"
  );
});
