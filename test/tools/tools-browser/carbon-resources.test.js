import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
    ResourceGroup, ResourceGroupImpl, ResourceInfo, ResourceInfoParams, ResultType,
    VersionInternal, Location, ResourceGroupMergeParams, ResourceGroupDiffAgainstGroupParams,
    ResourceGroupRemoveResourcesParams, ResourceGroupImportFromFileParams, ResourceGroupExportToFileParams
} from "../../../src/tools/fileindex/carbon/index.js";

const fixture = name => fs.readFileSync(new URL("../fixtures/carbon-resources/" + name, import.meta.url), "utf8");
const csv = text =>
{
    const group = new ResourceGroup();
    assert.equal(group.m_impl.ImportFromCSV(text).type, ResultType.SUCCESS);
    return group;
};
const exportCsv = group =>
{
    const out = { value: "" };
    assert.equal(group.m_impl.ExportCsv(new VersionInternal(0, 0, 0), out).type, ResultType.SUCCESS);
    return out.value;
};

test("Carbon's own overflowing binary-operation fixture returns MALFORMED_RESOURCE_INPUT", () =>
{
    // resources/tests/src/ResourcesLibraryTest.cpp:124-132
    const group = new ResourceGroupImpl();
    assert.equal(group.ImportFromCSV(fixture("overflow.txt")).type, ResultType.MALFORMED_RESOURCE_INPUT);
});

test("Carbon merge fixture: incoming record wins and export sorts by relative path", () =>
{
    // resources/tests/testData/MergeGroups/CSVWithIntersect
    const source = csv(fixture("merge-base.txt"));
    const params = new ResourceGroupMergeParams();
    params.resourceGroupToMerge = csv(fixture("merge-incoming.txt"));
    params.mergedResourceGroup = new ResourceGroup();
    assert.equal(source.Merge(params).type, ResultType.SUCCESS);
    assert.equal(exportCsv(params.mergedResourceGroup).trim(), fixture("merge-expected.txt").replaceAll("\r\n", "\n").trim());
});

test("Carbon's checksum comparison ignores a changed storage location with identical bytes", () =>
{
    // ResourceGroupImpl.cpp:3303 compares GetChecksum, not location or sizes.
    const before = csv("res:/a,aa/old,abc,10,5\nres:/gone,aa/gone,x,1,1");
    const after = csv("res:/a,bb/new,abc,12,6\nres:/new,aa/new,y,1,1");
    const params = new ResourceGroupDiffAgainstGroupParams();
    params.resourceGroupToDiffAgainst = before;
    params.additions = [];
    params.subtractions = [];
    assert.equal(after.DiffAgainstGroup(params).type, ResultType.SUCCESS);
    assert.deepEqual(params.additions, ["new"]);
    assert.deepEqual(params.subtractions, ["gone"]);
});

test("uint64 sizes retain all bits through CSV import and export", () =>
{
    const row = "res:/huge,aa/file,abc,18446744073709551615,9007199254740993,4294967295";
    assert.equal(exportCsv(csv(row)).trim(), row);
});

test("native parser retains case and duplicate rows rather than applying CjsFileIndex policy", () =>
{
    const group = csv("res:/A,aa/first,abc,1,1\nres:/A,aa/second,def,1,1");
    assert.equal(group.m_impl.GetSize(), 2);
    assert.equal(group.m_impl.m_resourcesParameter[0].m_relativePath.GetValue(), "A");
});

test("zero compressed size remains unset, and failed removal retains Carbon's counter mutation", () =>
{
    // ResourceInfo.cpp:71 and ResourceGroupImpl.cpp:3041-3065.
    const group = csv("res:/empty,aa/empty,abc,0,0");
    const resource = group.m_impl.m_resourcesParameter[0];
    assert.equal(resource.GetCompressedSize({}).type, ResultType.RESOURCE_VALUE_NOT_SET);
    const params = new ResourceGroupRemoveResourcesParams();
    params.resourcesToRemove = ["empty"];
    assert.equal(group.RemoveResources(params).type, ResultType.RESOURCE_VALUE_NOT_SET);
    assert.equal(group.m_impl.GetSize(), 1);
    assert.equal(group.m_impl.m_numberOfResources.GetValue(), 0n, "uintmax_t count");
});

test("native empty YAML document round trips with group identity intact", () =>
{
    const group = new ResourceGroupImpl();
    assert.equal(group.ImportFromYamlString(fixture("empty.yaml")).type, ResultType.SUCCESS);
    const out = {};
    assert.equal(group.ExportToData(out).type, ResultType.SUCCESS);
    const second = new ResourceGroupImpl();
    assert.equal(second.ImportFromYamlString(out.value).type, ResultType.SUCCESS);
    assert.equal(second.GetSize(), 0);
    assert.equal(second.GetType(), "ResourceGroup");
});

test("native location fixture uses FNV-1 over prefixed path", () =>
{
    const location = new Location();
    assert.equal(location.SetFromRelativePathAndDataChecksum("intromovie.txt", "e6bbb2df307e5a9527159a4c971034b5", "res").type, ResultType.SUCCESS);
    assert.equal(location.ToString(), "a9/a9d1721dd5cc6d54_e6bbb2df307e5a9527159a4c971034b5");
});

test("native equality is relative-path equality regardless of checksum", () =>
{
    const first = new ResourceInfoParams();
    first.relativePath = "same";
    first.checksum = "a";
    const second = new ResourceInfoParams();
    second.relativePath = "same";
    second.checksum = "b";
    assert.equal(new ResourceInfo(first).Equals(new ResourceInfo(second)), true);
});

test("native version comparison quirk remains explicit", () =>
{
    // VersionInternal.cpp:33-67 checks later components even after a major mismatch.
    const a = new VersionInternal(1, 0, 0);
    const b = new VersionInternal(0, 1, 0);
    assert.equal(a.GreaterThan(b), true);
    assert.equal(a.LessThan(b), true);
});

test("unported native I/O reports an explicit implementation gap", () =>
{
    assert.throws(() => new ResourceGroup().CreatePatch({}), /not (ported|implemented)/);
    assert.throws(() => new ResourceInfo().GetData({}), /not implemented/);
});

test("file methods use only injected readers and writers, including asynchronous byte sources", async () =>
{
    const group = new ResourceGroup();
    const input = new ResourceGroupImportFromFileParams();
    input.filename = "virtual/index.txt";
    input.read = async filename =>
    {
        assert.equal(filename, "virtual/index.txt");
        return new TextEncoder().encode("res:/injected,aa/file,abc,10,5\n");
    };
    assert.equal((await group.ImportFromFile(input)).type, ResultType.SUCCESS);
    const output = new ResourceGroupExportToFileParams();
    output.filename = "virtual/output.txt";
    output.outputDocumentVersion = new VersionInternal(0, 0, 0);
    let saved;
    output.write = async (filename, data) => { saved = { filename, data }; };
    assert.equal((await group.ExportToFile(output)).type, ResultType.SUCCESS);
    assert.deepEqual(saved, { filename: "virtual/output.txt", data: "res:/injected,aa/file,abc,10,5\n" });
});

test("file methods require injection and map host failures to native result codes", async () =>
{
    const group = new ResourceGroup();
    const input = new ResourceGroupImportFromFileParams();
    assert.equal((await group.ImportFromFile(input)).type, ResultType.FILE_NOT_FOUND);
    input.filename = "virtual/index.txt";
    await assert.rejects(group.ImportFromFile(input), /injected read/);
    input.read = async () => { throw new Error("host read failed"); };
    assert.equal((await group.ImportFromFile(input)).type, ResultType.FAILED_TO_OPEN_FILE);
    const output = new ResourceGroupExportToFileParams();
    await assert.rejects(group.ExportToFile(output), /injected write/);
    output.write = async () => { throw new Error("host write failed"); };
    assert.equal((await group.ExportToFile(output)).type, ResultType.FAILED_TO_SAVE_FILE);
    output.write = () => false;
    assert.equal((await group.ExportToFile(output)).type, ResultType.FAILED_TO_SAVE_FILE);
});

test("native import extension policy and export document version select the format", async () =>
{
    const group = new ResourceGroup();
    const input = new ResourceGroupImportFromFileParams();
    input.filename = "virtual/index.csv";
    input.read = () => "res:/a,aa/file,abc,10,5";
    assert.equal((await group.ImportFromFile(input)).type, ResultType.UNSUPPORTED_FILE_FORMAT);
    input.filename = "virtual/index";
    input.read = () => fixture("empty.yaml");
    assert.equal((await group.ImportFromFile(input)).type, ResultType.SUCCESS);
    const output = new ResourceGroupExportToFileParams();
    output.filename = "virtual/index.txt";
    let saved;
    output.write = (_filename, text) => { saved = text; };
    assert.equal((await group.ExportToFile(output)).type, ResultType.SUCCESS);
    assert.match(saved, /Version: 0\.1\.0/);
});
