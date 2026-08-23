/**
 * Synthetic authored topology used to exercise the browser library without
 * implying that market groups, skills, or visual proximity define EVE's tree.
 * Real providers should supply their own topology and resolved image URLs.
 */
export const syntheticShipTree = {
    factionID: 9001,
    factions: [ {
        factionID: 9001,
        name: "Synthetic Republic",
        shortName: "SR",
        description: "Fast, adaptable hulls built around mobility, field repair, and flexible weapon systems."
    } ],
    groups: [
        { id: "shuttle", label: "Shuttle", tier: "I", typeIDs: [ 9101 ], layout: { x: 60, y: 960, columns: 1 } },
        { id: "frigate", label: "Frigate", tier: "I", typeIDs: [ 9201, 9202, 9203 ], layout: { x: 330, y: 800, columns: 3 } },
        { id: "assault", label: "Assault Frigate", tier: "II", typeIDs: [ 9701, 9702 ], layout: { x: 520, y: 300, columns: 2 } },
        { id: "destroyer", label: "Destroyer", tier: "I", typeIDs: [ 9301, 9302 ], layout: { x: 760, y: 800, columns: 2 } },
        { id: "interdictor", label: "Interdictor", tier: "II", typeIDs: [ 9801 ], layout: { x: 810, y: 300, columns: 1 } },
        { id: "cruiser", label: "Cruiser", tier: "I", typeIDs: [ 9401, 9402, 9403 ], layout: { x: 1080, y: 800, columns: 3 } },
        { id: "heavy-assault", label: "Heavy Assault Cruiser", tier: "II", typeIDs: [ 9901, 9902 ], layout: { x: 1180, y: 300, columns: 2 } },
        { id: "battlecruiser", label: "Battlecruiser", tier: "I", typeIDs: [ 9501, 9502 ], layout: { x: 1510, y: 800, columns: 2 } },
        { id: "command", label: "Command Ship", tier: "II", typeIDs: [ 9911 ], layout: { x: 1560, y: 300, columns: 1 } },
        { id: "battleship", label: "Battleship", tier: "I", typeIDs: [ 9601, 9602 ], layout: { x: 1840, y: 800, columns: 2 } },
        { id: "marauder", label: "Marauder", tier: "II", typeIDs: [ 9921 ], layout: { x: 1890, y: 300, columns: 1 } }
    ],
    types: [
        SyntheticType(9101, "Wayfarer", "Civilian shuttle", 1, 5, 0, "A compact personnel shuttle intended for safe, inexpensive travel."),
        SyntheticType(9201, "Wisp", "Attack frigate", 1, 5, 1, "A fast strike hull that rewards close-range positioning."),
        SyntheticType(9202, "Kite", "Exploration frigate", 1, 4, 2, "A light survey hull with expanded probe and utility capability."),
        SyntheticType(9203, "Mender", "Logistics frigate", 1, 3, 3, "A mobile support hull specialized for remote field repair."),
        SyntheticType(9301, "Pike", "Destroyer", 1, 4, 4, "A high-output gun platform designed to screen smaller hulls."),
        SyntheticType(9302, "Gale", "Tactical destroyer", 2, 2, 5, "An adaptable destroyer with selectable tactical profiles."),
        SyntheticType(9401, "Ventureline", "Attack cruiser", 1, 5, 6, "A balanced attack cruiser with strong projection and speed."),
        SyntheticType(9402, "Hearth", "Logistics cruiser", 1, 4, 7, "A fleet support cruiser with efficient remote repair systems."),
        SyntheticType(9403, "Raptor", "Disruption cruiser", 1, 3, 8, "A control hull built to inhibit hostile movement and targeting."),
        SyntheticType(9501, "Rampart", "Combat battlecruiser", 1, 3, 9, "A durable command-scale hull with sustained firepower."),
        SyntheticType(9502, "Longbow", "Attack battlecruiser", 1, 2, 10, "A lighter battlecruiser focused on range and rapid deployment."),
        SyntheticType(9601, "Citadel", "Attack battleship", 1, 2, 11, "A heavy attack platform with broad weapon support."),
        SyntheticType(9602, "Stormwall", "Combat battleship", 1, 1, 12, "A resilient line battleship intended to hold contested space."),
        SyntheticType(9701, "Needle", "Assault frigate", 2, 4, 13, "A hardened frigate with exceptional short-range pressure."),
        SyntheticType(9702, "Lantern", "Electronic attack ship", 2, 2, 14, "A specialist frigate that magnifies electronic warfare systems."),
        SyntheticType(9801, "Snare", "Interdictor", 2, 2, 15, "A fleet interdiction hull able to constrain movement corridors."),
        SyntheticType(9901, "Furnace", "Heavy assault cruiser", 2, 3, 16, "An assault cruiser that converts speed into survivability."),
        SyntheticType(9902, "Bulwark", "Heavy interdiction cruiser", 2, 1, 17, "A heavily reinforced cruiser for persistent area denial."),
        SyntheticType(9911, "Marshal", "Command ship", 2, 2, 18, "A battle command hull that coordinates and strengthens its fleet."),
        SyntheticType(9921, "Judicator", "Marauder", 2, 1, 19, "A self-sufficient siege platform built for prolonged engagements.")
    ],
    edges: [
        { id: "shuttle-frigate", sourceGroupID: "shuttle", targetGroupID: "frigate", kind: "primary" },
        { id: "frigate-destroyer", sourceGroupID: "frigate", targetGroupID: "destroyer", kind: "primary" },
        { id: "destroyer-cruiser", sourceGroupID: "destroyer", targetGroupID: "cruiser", kind: "primary" },
        { id: "cruiser-battlecruiser", sourceGroupID: "cruiser", targetGroupID: "battlecruiser", kind: "primary" },
        { id: "battlecruiser-battleship", sourceGroupID: "battlecruiser", targetGroupID: "battleship", kind: "primary" },
        { id: "frigate-assault", sourceGroupID: "frigate", targetGroupID: "assault", kind: "specialization" },
        { id: "destroyer-interdictor", sourceGroupID: "destroyer", targetGroupID: "interdictor", kind: "specialization" },
        { id: "cruiser-heavy-assault", sourceGroupID: "cruiser", targetGroupID: "heavy-assault", kind: "specialization" },
        { id: "battlecruiser-command", sourceGroupID: "battlecruiser", targetGroupID: "command", kind: "specialization" },
        { id: "battleship-marauder", sourceGroupID: "battleship", targetGroupID: "marauder", kind: "specialization" }
    ],
    provenance: {
        provider: "bundled fixture",
        synthetic: true
    }
};

function SyntheticType(typeID, name, className, techLevel, masteryLevel, variant, summary)
{
    return {
        typeID,
        name,
        className,
        techLevel,
        masteryLevel,
        imageURL: SyntheticHullImage(variant),
        preview: {
            summary,
            traits: [
                { label: "Role", value: className },
                { label: "Technology", value: `Tech ${techLevel}` },
                { label: "Mastery", value: masteryLevel > 0 ? `Level ${masteryLevel}` : "None" }
            ]
        }
    };
}

function SyntheticHullImage(variant)
{
    const paths = [
        "M8 27 28 14 70 16 92 27 70 38 28 40Z",
        "M7 27 34 9 77 18 94 27 77 36 34 45Z",
        "M5 27 25 18 58 8 94 27 58 46 25 36Z",
        "M6 27 31 11 66 14 93 27 66 40 31 43Z",
        "M5 27 24 11 82 19 95 27 82 35 24 43Z",
        "M6 27 38 8 78 13 94 27 78 41 38 46Z",
        "M4 27 29 15 56 12 94 27 56 42 29 39Z",
        "M5 27 20 17 70 7 95 27 70 47 20 37Z"
    ];
    const path = paths[Math.abs(variant) % paths.length];
    const hue = 184 + Math.abs(variant * 19) % 42;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 54"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 18% 78%)"/><stop offset="1" stop-color="hsl(${hue} 24% 32%)"/></linearGradient></defs><path d="${path}" fill="url(#g)" stroke="hsl(${hue} 30% 84%)"/><path d="M17 27h66M42 17l9 20M65 17l-8 20" fill="none" stroke="hsl(${hue} 26% 22%)" stroke-width="2" opacity=".75"/></svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
