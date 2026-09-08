// This ratchets comparison evidence, never declares scanner output authoritative.
import { createHash } from "node:crypto";

export const policyVersion = 2;
const knownVerdicts = new Set(["match", "type-mismatch", "missing-in-file", "extra-in-file", "class-policy", "method-match", "missing-method", "existing-unexposed-method", "method-metadata", "additional-carbon-method"]);

function stable(value)
{
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object")
    {
        const result = {};
        for (const key of Object.keys(value).sort())
        {
            if (key !== "line") result[key] = stable(value[key]);
        }
        return result;
    }
    return typeof value === "string" ? value.replace(/\(line \d+\)/g, "(line)") : value;
}

/** Key a finding by relative source identity and evidence, ignoring source positions. */
export function findingKey(item)
{
    const identity = JSON.stringify([item.filePath, item.class, item.name || null, item.verdict || item.code]);
    const hash = createHash("sha256").update(JSON.stringify(stable(item))).digest("hex");
    return `${identity}:${hash}`;
}

function memberEvidence(item, group)
{
    const evidence = [];
    if (item.name === "<class>") return evidence;
    for (const side of ["expected", "actual"])
    {
        const member = item[side];
        if (!member) continue;
        const prefix = JSON.stringify([group, item.name, side]);
        evidence.push(prefix);
        // Loss of determinate defaults or observed metadata can turn a failed
        // comparison into an informational note. Preserve evidence presence,
        // not values: fixing a value must still be able to retire its finding.
        for (const key of ["type", "typeArg", "enumType", "enumArg", "io", "notify", "defaultDeterminate", "hasReason"])
        {
            if (member[key]) evidence.push(`${prefix}/${key}`);
        }
        for (const key of ["carbon", "carbonOriginalNames", "implementation"])
        {
            if (member[key]?.length) evidence.push(`${prefix}/${key}`);
        }
    }
    return evidence;
}

/** Separate comparison findings, advisories, and incomplete coverage. */
export function classify(report)
{
    const result = { findings: [], advisories: [], coverage: [], memberCoverage: {}, gaps: [], failures: [], excluded: [] };
    if (report.status === "SKIP") return { ...result, skip: report.reason };
    if (report.status !== "COMPLETE") result.failures.push(`Audit status ${report.status}`);
    const byFile = new Map();
    const inventory = new Map(report.inventory.map(item => [item.filePath, item]));
    for (const item of report.classInventory)
    {
        if (!byFile.has(item.filePath)) byFile.set(item.filePath, []);
        byFile.get(item.filePath).push(item);
    }
    for (const row of report.reports)
    {
        const entry = inventory.get(row.filePath);
        if (!entry) throw new Error(`Missing inventory for ${row.filePath}`);
        if (entry.state === "dropped" || row.family === "trinityal")
        {
            result.excluded.push({ filePath: row.filePath, reason: entry.state === "dropped" ? "dropped" : "AL schema" });
            continue;
        }
        if (row.error)
        {
            const error = { filePath: row.filePath, class: entry.class, code: row.code };
            if (row.code === "schema-doc-missing") result.advisories.push(error);
            else if (row.code === "schema-doc-ambiguous") result.gaps.push(error);
            else result.failures.push(error);
            continue;
        }
        if (row.tool !== "carbon-class" || row.mode !== "check" || row.schemaVersion !== 1 || !Array.isArray(row.fields) || !Array.isArray(row.methods) || !row.summary) throw new Error("Unrecognized checker JSON contract");
        const selected = (byFile.get(row.filePath) || []).find(item => item.exported);
        if (!selected || selected.class !== row.class)
        {
            result.gaps.push({ filePath: row.filePath, class: row.class, code: "checker-class-identity-mismatch", expected: selected?.class || null });
            continue;
        }
        const classKey = `${row.filePath}#${row.class}`;
        if (result.memberCoverage[classKey]) throw new Error(`Duplicate class report: ${classKey}`);
        result.coverage.push(classKey);
        const members = new Set();
        result.memberCoverage[classKey] = [];
        if (row.fallback) result.gaps.push({ filePath: row.filePath, class: row.class, code: "schema-detail-fallback", fallback: row.fallback });
        for (const group of ["fields", "methods"])
        {
            for (const item of row[group])
            {
                if (!knownVerdicts.has(item.verdict) || !["ok", "info", "warning", "error"].includes(item.severity) || typeof item.name !== "string" || !Array.isArray(item.notes)) throw new Error(`Unknown finding contract: ${item.verdict}:${item.severity}`);
                for (const key of memberEvidence(item, group)) members.add(key);
                const finding = { filePath: row.filePath, class: row.class, ...item };
                const familyOnly = item.verdict === "class-policy" && item.notes.length > 0 && item.notes.every(note => note.startsWith("@type.define family must be"));
                if (item.severity === "error" && !familyOnly) result.findings.push(finding);
                else if (item.severity !== "ok" || item.notes.length) result.advisories.push(finding);
            }
        }
        result.memberCoverage[classKey] = [...members].sort();
    }
    const coverage = new Set(result.coverage);
    for (const item of report.classInventory)
    {
        if (item.state === "dropped") continue;
        const hasSchema = item.schemaMatches.some(match => match.family !== "trinityal") || item.nestedCandidates.some(match => match.family !== "trinityal");
        if (hasSchema && !coverage.has(`${item.filePath}#${item.class}`)) result.gaps.push({ filePath: item.filePath, class: item.class, code: "class-not-checked" });
    }
    if (!result.coverage.length) result.failures.push("Zero trustworthy class checks");
    return result;
}

function additionalCount(current)
{
    return current.advisories.filter(item => item.verdict === "additional-carbon-method").length;
}

/** Build a portable baseline without raw schema data, local paths, or run logs. */
export function baselineFromReport(report)
{
    const current = classify(report);
    if (current.skip || current.failures.length) throw new Error("Cannot record skipped or failed evidence");
    if (!Array.isArray(report.schemaCoverage) || !report.schemaCoverage.length) throw new Error("Missing schema coverage inventory");
    return {
        policyVersion,
        coverage: current.coverage.sort(),
        memberCoverage: Object.fromEntries(Object.entries(current.memberCoverage).sort(([a], [b]) => a.localeCompare(b))),
        schemaCoverage: [...report.schemaCoverage].sort(),
        findings: current.findings.map(findingKey).sort(),
        gaps: current.gaps.map(findingKey).sort(),
        advisoryCounts: { additionalCarbonMethods: additionalCount(current) }
    };
}

/** Fail new comparison debt or loss of previously observed classes and members. */
export function evaluate(report, baseline)
{
    const current = classify(report);
    if (current.skip) return { status: "SKIP", reason: current.skip };
    if (baseline.policyVersion !== policyVersion) throw new Error("Baseline policy version differs; review required");
    const knownFindings = new Set(baseline.findings);
    const knownGaps = new Set(baseline.gaps);
    const findings = current.findings.filter(item => !knownFindings.has(findingKey(item)));
    const gaps = current.gaps.filter(item => !knownGaps.has(findingKey(item)));
    const coverage = new Set(current.coverage);
    const lostCoverage = baseline.coverage.filter(item => !coverage.has(item));
    const schemaCoverage = new Set(report.schemaCoverage);
    const lostSchemaCoverage = baseline.schemaCoverage.filter(item => !schemaCoverage.has(item));
    const lostMemberCoverage = [];
    for (const [classKey, previous] of Object.entries(baseline.memberCoverage))
    {
        if (!coverage.has(classKey)) continue;
        const members = new Set(current.memberCoverage[classKey]);
        for (const member of previous)
        {
            if (!members.has(member)) lostMemberCoverage.push({ class: classKey, member });
        }
    }
    const remaining = new Set(current.findings.map(findingKey));
    const resolved = baseline.findings.filter(key => !remaining.has(key)).length;
    const additionalCarbonMethods = additionalCount(current);
    return {
        status: current.failures.length || findings.length || gaps.length || lostCoverage.length || lostMemberCoverage.length || lostSchemaCoverage.length ? "FAIL" : "PASS",
        failures: current.failures, newFindings: findings, newGaps: gaps, lostCoverage, lostMemberCoverage, lostSchemaCoverage,
        counts: {
            checked: current.coverage.length, findings: current.findings.length, advisories: current.advisories.length,
            additionalCarbonMethods, additionalCarbonMethodsDelta: additionalCarbonMethods - baseline.advisoryCounts.additionalCarbonMethods,
            gaps: current.gaps.length, excluded: current.excluded.length, resolved
        }
    };
}

/** Bank fixes only after PASS; never initialize or expand accepted debt. */
export function updateBaseline(report, baseline)
{
    const result = evaluate(report, baseline);
    if (result.status !== "PASS") throw new Error("Baseline update refused: bank fixes only after PASS; never silence fresh findings or lost coverage");
    return baselineFromReport(report);
}
