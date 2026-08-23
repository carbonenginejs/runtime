/**
 * Produces deterministic renderer-neutral diagram records from an authored
 * Ship Tree answer. The source supplies topology and layout hints; this helper
 * only realizes those hints as groups, cards, and routed connections.
 */
export function layoutShipTree(tree, options = {})
{
    if (!tree || typeof tree !== "object") throw new TypeError("Ship Tree data must be a record");

    const settings = createSettings(options);
    const sourceGroups = copyIterable(tree.groups ?? [], "groups");
    const sourceTypes = copyIterable(tree.types ?? [], "types");
    const sourceEdges = copyIterable(tree.edges ?? [], "edges");
    const typesByID = indexTypes(sourceTypes);
    const layouts = [];
    let maximumGroupWidth = settings.minimumGroupWidth;
    let maximumGroupHeight = settings.minimumGroupHeight;

    for (const group of sourceGroups)
    {
        const layout = measureGroup(group, typesByID, settings);

        layouts.push(layout);
        if (layout.width > maximumGroupWidth) maximumGroupWidth = layout.width;
        if (layout.height > maximumGroupHeight) maximumGroupHeight = layout.height;
    }

    const groups = [];
    const nodes = [];
    const groupsByID = new Map();

    for (const layout of layouts)
    {
        positionGroup(layout, maximumGroupWidth, maximumGroupHeight, settings);
        groups.push(layout.group);
        groupsByID.set(layout.group.id, layout.group);

        for (const node of layout.nodes)
        {
            nodes.push(node);
        }
    }

    const edges = [];

    for (const edge of sourceEdges)
    {
        edges.push(layoutEdge(edge, groupsByID));
    }

    return {
        nodes,
        edges,
        groups,
        layers: [
            { id: "connections", label: "Progression connections", pickable: false },
            { id: "groups", label: "Ship groups", pickable: false },
            { id: "ships", label: "Ships", pickable: true }
        ]
    };
}

function createSettings(options)
{
    return {
        cardWidth: positiveNumber(options.cardWidth ?? 96, "cardWidth"),
        cardHeight: positiveNumber(options.cardHeight ?? 104, "cardHeight"),
        cardGap: nonNegativeNumber(options.cardGap ?? 4, "cardGap"),
        groupGapX: nonNegativeNumber(options.groupGapX ?? 150, "groupGapX"),
        groupGapY: nonNegativeNumber(options.groupGapY ?? 180, "groupGapY"),
        groupPadding: nonNegativeNumber(options.groupPadding ?? 4, "groupPadding"),
        groupHeaderHeight: positiveNumber(options.groupHeaderHeight ?? 30, "groupHeaderHeight"),
        minimumGroupWidth: positiveNumber(options.minimumGroupWidth ?? 104, "minimumGroupWidth"),
        minimumGroupHeight: positiveNumber(options.minimumGroupHeight ?? 142, "minimumGroupHeight")
    };
}

function measureGroup(group, typesByID, settings)
{
    if (!group || typeof group !== "object") throw new TypeError("Ship Tree groups must be records");

    const id = stableID(group.id, "group.id");
    const typeIDs = copyIterable(group.typeIDs ?? [], `group ${id} typeIDs`);
    const columns = positiveInteger(group.layout?.columns ?? Math.min(Math.max(typeIDs.length, 1), 2), `group ${id} columns`);
    const rowCount = Math.max(1, Math.ceil(typeIDs.length / columns));
    const width = Math.max(
        settings.minimumGroupWidth,
        settings.groupPadding * 2 + columns * settings.cardWidth + (columns - 1) * settings.cardGap
    );
    const height = Math.max(
        settings.minimumGroupHeight,
        settings.groupPadding * 2 + settings.groupHeaderHeight
            + rowCount * settings.cardHeight + (rowCount - 1) * settings.cardGap
    );
    const nodes = [];

    for (let index = 0; index < typeIDs.length; index++)
    {
        const typeID = stableID(typeIDs[index], `group ${id} typeID`);
        const type = typesByID.get(typeID);

        if (!type) throw new Error(`Ship Tree group ${id} references missing type ${typeID}`);

        nodes.push({
            id: typeID,
            kind: "ship",
            label: String(type.name ?? typeID),
            groupID: id,
            importance: finiteNumber(type.importance ?? 1, `type ${typeID} importance`),
            position: { x: 0, y: 0 },
            size: { width: settings.cardWidth, height: settings.cardHeight },
            type
        });
    }

    return {
        column: nonNegativeInteger(group.layout?.column ?? 0, `group ${id} column`),
        row: nonNegativeInteger(group.layout?.row ?? 0, `group ${id} row`),
        x: optionalFiniteNumber(group.layout?.x, `group ${id} x`),
        y: optionalFiniteNumber(group.layout?.y, `group ${id} y`),
        columns,
        width,
        height,
        nodes,
        source: group,
        group: null
    };
}

function positionGroup(layout, maximumGroupWidth, maximumGroupHeight, settings)
{
    const minX = layout.x ?? layout.column * (maximumGroupWidth + settings.groupGapX);
    const minY = layout.y ?? layout.row * (maximumGroupHeight + settings.groupGapY);
    const memberIDs = [];

    for (let index = 0; index < layout.nodes.length; index++)
    {
        const node = layout.nodes[index];
        const column = index % layout.columns;
        const row = Math.floor(index / layout.columns);

        node.position.x = minX + settings.groupPadding + settings.cardWidth / 2
            + column * (settings.cardWidth + settings.cardGap);
        node.position.y = minY + settings.groupPadding + settings.groupHeaderHeight
            + settings.cardHeight / 2 + row * (settings.cardHeight + settings.cardGap);
        memberIDs.push(node.id);
    }

    layout.group = {
        id: stableID(layout.source.id, "group.id"),
        kind: "ship-group",
        label: String(layout.source.label ?? layout.source.name ?? layout.source.id),
        laneID: nullableID(layout.source.laneID),
        tier: layout.source.tier ?? null,
        memberIDs,
        bounds: {
            minX,
            minY,
            maxX: minX + layout.width,
            maxY: minY + layout.height
        },
        source: layout.source
    };
}

function layoutEdge(edge, groupsByID)
{
    if (!edge || typeof edge !== "object") throw new TypeError("Ship Tree edges must be records");

    const id = stableID(edge.id, "edge.id");
    const sourceID = stableID(edge.sourceGroupID ?? edge.sourceID, `edge ${id} sourceGroupID`);
    const targetID = stableID(edge.targetGroupID ?? edge.targetID, `edge ${id} targetGroupID`);
    const source = groupsByID.get(sourceID);
    const target = groupsByID.get(targetID);

    if (!source) throw new Error(`Ship Tree edge ${id} references missing source group ${sourceID}`);
    if (!target) throw new Error(`Ship Tree edge ${id} references missing target group ${targetID}`);

    return {
        id,
        kind: edge.kind ?? "progression",
        sourceID,
        targetID,
        sourceGroupID: sourceID,
        targetGroupID: targetID,
        points: layoutEdgePoints(edge, source.bounds, target.bounds),
        source: edge
    };
}

function layoutEdgePoints(edge, sourceBounds, targetBounds)
{
    const authored = edge.points ?? edge.layout?.points;

    if (authored === undefined) return routeGroups(sourceBounds, targetBounds);
    if (!authored || typeof authored[Symbol.iterator] !== "function")
    {
        throw new TypeError(`Ship Tree edge ${edge.id} points must be iterable`);
    }

    const points = [];

    for (const point of authored)
    {
        if (!point || typeof point !== "object")
        {
            throw new TypeError(`Ship Tree edge ${edge.id} points must be records`);
        }

        points.push({
            x: finiteNumber(point.x, `edge ${edge.id} point x`),
            y: finiteNumber(point.y, `edge ${edge.id} point y`)
        });
    }

    if (points.length < 2) throw new RangeError(`Ship Tree edge ${edge.id} requires at least two points`);

    return points;
}

function routeGroups(source, target)
{
    const sourceCenterX = (source.minX + source.maxX) / 2;
    const sourceCenterY = (source.minY + source.maxY) / 2;
    const targetCenterX = (target.minX + target.maxX) / 2;
    const targetCenterY = (target.minY + target.maxY) / 2;
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;

    if (Math.abs(deltaY) >= Math.abs(deltaX))
    {
        const downward = deltaY >= 0;
        const startY = downward ? source.maxY : source.minY;
        const endY = downward ? target.minY : target.maxY;
        const middleY = (startY + endY) / 2;

        return [
            { x: sourceCenterX, y: startY },
            { x: sourceCenterX, y: middleY },
            { x: targetCenterX, y: middleY },
            { x: targetCenterX, y: endY }
        ];
    }

    const rightward = deltaX >= 0;
    const startX = rightward ? source.maxX : source.minX;
    const endX = rightward ? target.minX : target.maxX;
    const middleX = (startX + endX) / 2;

    return [
        { x: startX, y: sourceCenterY },
        { x: middleX, y: sourceCenterY },
        { x: middleX, y: targetCenterY },
        { x: endX, y: targetCenterY }
    ];
}

function indexTypes(types)
{
    const result = new Map();

    for (const type of types)
    {
        if (!type || typeof type !== "object") throw new TypeError("Ship Tree types must be records");

        const typeID = stableID(type.typeID ?? type.id, "type.typeID");

        if (result.has(typeID)) throw new Error(`Duplicate Ship Tree type ID: ${typeID}`);

        result.set(typeID, type);
    }

    return result;
}

function copyIterable(value, label)
{
    if (!value || typeof value[Symbol.iterator] !== "function")
    {
        throw new TypeError(`Ship Tree ${label} must be iterable`);
    }

    const result = [];

    for (const item of value)
    {
        result.push(item);
    }

    return result;
}

function nullableID(value)
{
    return value === null || value === undefined ? null : stableID(value, "laneID");
}

function stableID(value, label)
{
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    throw new TypeError(`${label} must be a non-empty string or finite number`);
}

function positiveInteger(value, label)
{
    value = finiteNumber(value, label);

    if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${label} must be a positive integer`);

    return value;
}

function nonNegativeInteger(value, label)
{
    value = finiteNumber(value, label);

    if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer`);

    return value;
}

function positiveNumber(value, label)
{
    value = finiteNumber(value, label);

    if (value <= 0) throw new RangeError(`${label} must be greater than zero`);

    return value;
}

function nonNegativeNumber(value, label)
{
    value = finiteNumber(value, label);

    if (value < 0) throw new RangeError(`${label} must not be negative`);

    return value;
}

function finiteNumber(value, label)
{
    value = Number(value);

    if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);

    return value;
}

function optionalFiniteNumber(value, label)
{
    return value === undefined || value === null ? null : finiteNumber(value, label);
}
