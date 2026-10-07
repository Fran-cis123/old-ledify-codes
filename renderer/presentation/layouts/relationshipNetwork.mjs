import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// RELATIONSHIP NETWORK
// =========================================================
//
// slideType:
//      relationship
//
// layoutId:
//      relationship-network
//
// Canonical content:
//
// content: {
//
//     relationship: {
//
//         nodes: [
//             {
//                 id: "string",
//                 label: "string",
//                 description: "string"
//             }
//         ],
//
//         relationships: [
//             {
//                 from: "string",
//                 to: "string",
//                 label: "string"
//             }
//         ]
//
//     }
//
// }
//
// Purpose:
//
// Shows explicit relationships between concepts,
// entities, variables, systems, or components.
//
// IMPORTANT:
//
// The renderer does NOT invent:
//
// - a central concept
// - relationships
// - directions
// - labels
// - missing nodes
//
// Only relationships explicitly supplied through the
// canonical content structure are rendered.
//
// =========================================================

export const renderRelationshipNetwork = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    // =====================================================
    // 1. BACKGROUND
    // =====================================================

    applySlideBackground(
        slide,
        tokens
    );


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    // =====================================================
    // 2. TITLE
    // =====================================================

    addSlideTitle(
        slide,
        slideData.title,
        tokens
    );


    addAccentLine(
        slide,
        pptx,
        tokens,
        {
            x: 0.72,
            y: 1.22,
            w: 0.75
        }
    );


    // =====================================================
    // 3. NORMALIZE RELATIONSHIP DATA
    // =====================================================

    const relationship =
        normalizeRelationship(
            slideData?.content?.relationship
        );


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (!relationship) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    const {
        nodes,
        relationships
    } = relationship;


    // =====================================================
    // 5. ASSIGN VISUAL POSITIONS
    // =====================================================
    //
    // Positioning is purely visual.
    //
    // It does NOT change the semantic relationship
    // structure.
    //
    // =====================================================

    const positions =
        createNodePositions(
            nodes.length
        );


    const positionedNodes =
        nodes.map(
            (
                node,
                index
            ) => ({
                ...node,
                ...positions[index]
            })
        );


    // =====================================================
    // 6. NODE LOOKUP
    // =====================================================

    const nodeMap =
        new Map(
            positionedNodes.map(
                (node) => [
                    node.id,
                    node
                ]
            )
        );


    // =====================================================
    // 7. DRAW RELATIONSHIPS FIRST
    // =====================================================
    //
    // Connections are rendered before nodes so that
    // the node cards remain visually above the lines.
    //
    // =====================================================

    relationships.forEach(
        (relationshipItem) => {

            const fromNode =
                nodeMap.get(
                    relationshipItem.from
                );


            const toNode =
                nodeMap.get(
                    relationshipItem.to
                );


            // The validator should normally catch invalid
            // references before rendering.
            //
            // The renderer still protects itself.

            if (
                !fromNode ||
                !toNode
            ) {

                return;

            }


            renderConnection(
                {
                    slide,
                    pptx,
                    colors,
                    typography,
                    relationship:
                        relationshipItem,
                    fromNode,
                    toNode
                }
            );

        }
    );


    // =====================================================
    // 8. DRAW NODES
    // =====================================================

    positionedNodes.forEach(
        (
            node,
            index
        ) => {

            renderNode(
                {
                    slide,
                    pptx,
                    colors,
                    typography,
                    node,
                    index
                }
            );

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE RELATIONSHIP
// =========================================================

const normalizeRelationship = (
    relationship
) => {

    if (
        !relationship ||
        typeof relationship !== "object"
    ) {

        return null;

    }


    const nodes =
        normalizeNodes(
            relationship.nodes
        );


    if (
        nodes.length < 2
    ) {

        return null;

    }


    const nodeIds =
        new Set(
            nodes.map(
                (node) =>
                    node.id
            )
        );


    const relationships =
        normalizeRelationships(
            relationship.relationships,
            nodeIds
        );


    if (
        relationships.length === 0
    ) {

        return null;

    }


    return {
        nodes,
        relationships
    };

};


// =========================================================
// NORMALIZE NODES
// =========================================================

const normalizeNodes = (
    rawNodes
) => {

    const nodes =
        safeArray(
            rawNodes
        );


    const normalized = [];

    const usedIds =
        new Set();


    for (
        const node
        of nodes
    ) {

        if (
            !node ||
            typeof node !== "object" ||
            Array.isArray(node)
        ) {

            continue;

        }


        const id =
            normalizeText(
                node.id
            );


        const label =
            normalizeText(
                node.label
            );


        const description =
            normalizeText(
                node.description
            );


        // ID and label are structurally important.

        if (
            !id ||
            !label
        ) {

            continue;

        }


        // Duplicate IDs would make relationship
        // references ambiguous.

        if (
            usedIds.has(id)
        ) {

            continue;

        }


        usedIds.add(id);


        normalized.push({
            id,
            label,
            description
        });


        // Presentation readability protection.

        if (
            normalized.length >= 6
        ) {

            break;

        }

    }


    return normalized;

};


// =========================================================
// NORMALIZE RELATIONSHIPS
// =========================================================

const normalizeRelationships = (
    rawRelationships,
    nodeIds
) => {

    return safeArray(
        rawRelationships
    )
        .filter(
            (relationship) => {

                return (
                    relationship &&
                    typeof relationship ===
                        "object" &&
                    !Array.isArray(
                        relationship
                    )
                );

            }
        )
        .map(
            (relationship) => ({

                from:
                    normalizeText(
                        relationship.from
                    ),

                to:
                    normalizeText(
                        relationship.to
                    ),

                label:
                    normalizeText(
                        relationship.label
                    )

            })
        )
        .filter(
            (relationship) => {

                if (
                    !relationship.from ||
                    !relationship.to
                ) {

                    return false;

                }


                // Only render relationships between
                // nodes that actually exist.

                if (
                    !nodeIds.has(
                        relationship.from
                    ) ||
                    !nodeIds.has(
                        relationship.to
                    )
                ) {

                    return false;

                }


                // Self-referencing relationships are
                // not supported by this layout.

                if (
                    relationship.from ===
                    relationship.to
                ) {

                    return false;

                }


                return true;

            }
        )
        .slice(
            0,
            10
        );

};


// =========================================================
// NORMALIZE TEXT
// =========================================================

const normalizeText = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value.trim();

};


// =========================================================
// CREATE NODE POSITIONS
// =========================================================
//
// The positions depend only on the number of nodes.
//
// They do NOT imply semantic importance.
//
// =========================================================

const createNodePositions = (
    nodeCount
) => {

    const positionSets = {

        2: [
            {
                x: 1.6,
                y: 3.0
            },
            {
                x: 9.43,
                y: 3.0
            }
        ],


        3: [
            {
                x: 1.25,
                y: 3.0
            },
            {
                x: 5.52,
                y: 1.85
            },
            {
                x: 9.78,
                y: 3.0
            }
        ],


        4: [
            {
                x: 1.35,
                y: 2.0
            },
            {
                x: 9.68,
                y: 2.0
            },
            {
                x: 9.68,
                y: 4.75
            },
            {
                x: 1.35,
                y: 4.75
            }
        ],


        5: [
            {
                x: 1.05,
                y: 2.0
            },
            {
                x: 5.52,
                y: 1.65
            },
            {
                x: 9.98,
                y: 2.0
            },
            {
                x: 8.65,
                y: 4.85
            },
            {
                x: 2.38,
                y: 4.85
            }
        ],


        6: [
            {
                x: 1.05,
                y: 1.95
            },
            {
                x: 5.52,
                y: 1.65
            },
            {
                x: 9.98,
                y: 1.95
            },
            {
                x: 9.98,
                y: 4.85
            },
            {
                x: 5.52,
                y: 5.15
            },
            {
                x: 1.05,
                y: 4.85
            }
        ]

    };


    return (
        positionSets[
            Math.min(
                Math.max(
                    nodeCount,
                    2
                ),
                6
            )
        ] ||
        positionSets[2]
    );

};


// =========================================================
// RENDER CONNECTION
// =========================================================

const renderConnection = ({
    slide,
    pptx,
    colors,
    typography,
    relationship,
    fromNode,
    toNode
}) => {

    const nodeWidth =
        2.3;


    const nodeHeight =
        1.15;


    const fromCenterX =
        fromNode.x +
        nodeWidth / 2;


    const fromCenterY =
        fromNode.y +
        nodeHeight / 2;


    const toCenterX =
        toNode.x +
        nodeWidth / 2;


    const toCenterY =
        toNode.y +
        nodeHeight / 2;


    // =====================================================
    // CONNECTION LINE
    // =====================================================

    slide.addShape(
        pptx.ShapeType.line,
        {
            x:
                fromCenterX,

            y:
                fromCenterY,

            w:
                toCenterX -
                fromCenterX,

            h:
                toCenterY -
                fromCenterY,

            line: {
                color:
                    colors.border,

                width:
                    1.4,

                beginArrowType:
                    "none",

                endArrowType:
                    "triangle"
            }
        }
    );


    // =====================================================
    // RELATIONSHIP LABEL
    // =====================================================

    if (
        relationship.label
    ) {

        const midpointX =
            (
                fromCenterX +
                toCenterX
            ) /
            2;


        const midpointY =
            (
                fromCenterY +
                toCenterY
            ) /
            2;


        slide.addText(
            relationship.label,
            {
                x:
                    midpointX -
                    0.75,

                y:
                    midpointY -
                    0.16,

                w:
                    1.5,

                h:
                    0.32,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    7.5,

                bold:
                    true,

                color:
                    colors.textSecondary,

                fill: {
                    color:
                        colors.background,

                    transparency:
                        8
                },

                align:
                    "center",

                valign:
                    "mid",

                margin:
                    0.03,

                fit:
                    "shrink"
            }
        );

    }

};


// =========================================================
// RENDER NODE
// =========================================================

const renderNode = ({
    slide,
    pptx,
    colors,
    typography,
    node,
    index
}) => {

    const nodeWidth =
        2.3;


    const nodeHeight =
        1.15;


    // =====================================================
    // NODE CARD
    // =====================================================

    slide.addShape(
        pptx.ShapeType.roundRect,
        {
            x:
                node.x,

            y:
                node.y,

            w:
                nodeWidth,

            h:
                nodeHeight,

            rectRadius:
                0.08,

            fill: {
                color:
                    colors.surface
            },

            line: {
                color:
                    index % 2 === 0
                        ? colors.accentPrimary
                        : colors.accentSecondary,

                width:
                    1.2
            }
        }
    );


    // =====================================================
    // NODE LABEL
    // =====================================================

    slide.addText(
        node.label,
        {
            x:
                node.x +
                0.18,

            y:
                node.y +
                0.16,

            w:
                nodeWidth -
                0.36,

            h:
                node.description
                    ? 0.35
                    : 0.75,

            fontFace:
                typography.headingFamily,

            fontSize:
                10.5,

            bold:
                true,

            color:
                colors.textPrimary,

            align:
                "center",

            valign:
                node.description
                    ? "top"
                    : "mid",

            margin:
                0,

            fit:
                "shrink"
        }
    );


    // =====================================================
    // NODE DESCRIPTION
    // =====================================================

    if (
        node.description
    ) {

        slide.addText(
            node.description,
            {
                x:
                    node.x +
                    0.18,

                y:
                    node.y +
                    0.59,

                w:
                    nodeWidth -
                    0.36,

                h:
                    0.38,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    7.5,

                color:
                    colors.textSecondary,

                align:
                    "center",

                valign:
                    "mid",

                margin:
                    0,

                fit:
                    "shrink"
            }
        );

    }

};


// =========================================================
// EMPTY STATE
// =========================================================

const renderEmptyState = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "Relationship data is unavailable.",
        {
            x:
                0.8,

            y:
                3.3,

            w:
                11.7,

            h:
                0.5,

            fontFace:
                typography.bodyFamily,

            fontSize:
                12,

            color:
                colors.textMuted,

            align:
                "center",

            margin:
                0
        }
    );

};