import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    addCard,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// COMPARISON MULTI COLUMN
// =========================================================
//
// slideType:
//      comparison
//
// layoutId:
//      comparison-multi-column
//
// Canonical content:
//
// content: {
//
//     comparison: {
//
//         items: [
//             {
//                 label: "string",
//                 points: ["string"]
//             }
//         ]
//
//     }
//
// }
//
// Purpose:
//
// Compares three or more entities side-by-side.
//
// =========================================================

export const renderComparisonMultiColumn = ({
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
    // 2. CANONICAL COMPARISON CONTENT
    // =====================================================

    const items =
        safeArray(
            slideData?.content
                ?.comparison
                ?.items
        )
            .map(
                normalizeComparisonItem
            )
            .filter(
                hasMeaningfulComparisonItem
            )
            .slice(
                0,
                4
            );


    // =====================================================
    // 3. TITLE
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
    // 4. EMPTY STATE
    // =====================================================

    if (
        items.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. COLUMN GEOMETRY
    // =====================================================

    const startX =
        0.72;


    const totalWidth =
        11.89;


    const gap =
        0.18;


    const columnWidth =
        (
            totalWidth -
            gap *
            (
                items.length -
                1
            )
        ) /
        items.length;


    // =====================================================
    // 6. RENDER COMPARISON COLUMNS
    // =====================================================

    items.forEach(
        (
            item,
            index
        ) => {

            const x =
                startX +
                index *
                (
                    columnWidth +
                    gap
                );


            // =============================================
            // CARD
            // =============================================

            addCard(
                slide,
                pptx,
                tokens,
                {
                    x,
                    y: 1.72,
                    w: columnWidth,
                    h: 4.75
                }
            );


            // =============================================
            // TOP ACCENT
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x,
                    y: 1.72,
                    w: columnWidth,
                    h: 0.09,

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            index % 2 === 0
                                ? colors.accentPrimary
                                : colors.accentSecondary
                    }
                }
            );


            // =============================================
            // LABEL
            // =============================================

            slide.addText(
                item.label,
                {
                    x:
                        x +
                        0.25,

                    y:
                        2.12,

                    w:
                        columnWidth -
                        0.5,

                    h:
                        0.65,

                    fontFace:
                        typography.headingFamily,

                    fontSize:
                        items.length >= 4
                            ? 13
                            : 15,

                    bold:
                        true,

                    color:
                        colors.textPrimary,

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


            // =============================================
            // LABEL DIVIDER
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x:
                        x +
                        columnWidth /
                        2 -
                        0.3,

                    y:
                        2.95,

                    w:
                        0.6,

                    h:
                        0.045,

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            index % 2 === 0
                                ? colors.accentPrimary
                                : colors.accentSecondary
                    }
                }
            );


            // =============================================
            // POINTS
            // =============================================

            renderPoints(
                {
                    slide,
                    pptx,
                    points:
                        item.points,

                    x:
                        x +
                        0.28,

                    y:
                        3.28,

                    w:
                        columnWidth -
                        0.56,

                    colors,
                    typography,

                    compact:
                        items.length >= 4
                }
            );

        }
    );


    return slide;

};


// =========================================================
// RENDER POINTS
// =========================================================

const renderPoints = ({
    slide,
    pptx,
    points,
    x,
    y,
    w,
    colors,
    typography,
    compact
}) => {

    const visiblePoints =
        points.slice(
            0,
            compact
                ? 4
                : 5
        );


    if (
        visiblePoints.length === 0
    ) {

        slide.addText(
            "No comparison points provided.",
            {
                x,
                y,
                w,
                h: 0.45,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    9,

                color:
                    colors.textMuted,

                align:
                    "center",

                margin:
                    0
            }
        );

        return;

    }


    const availableHeight =
        2.65;


    const rowHeight =
        availableHeight /
        visiblePoints.length;


    visiblePoints.forEach(
        (
            point,
            index
        ) => {

            const pointY =
                y +
                index *
                rowHeight;


            // =============================================
            // BULLET
            // =============================================

            slide.addShape(
                pptx.ShapeType.ellipse,
                {
                    x,
                    y:
                        pointY +
                        0.1,

                    w:
                        0.11,

                    h:
                        0.11,

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            colors.accentPrimary
                    }
                }
            );


            // =============================================
            // POINT TEXT
            // =============================================

            slide.addText(
                point,
                {
                    x:
                        x +
                        0.25,

                    y:
                        pointY,

                    w:
                        w -
                        0.25,

                    h:
                        Math.max(
                            rowHeight -
                            0.08,
                            0.35
                        ),

                    fontFace:
                        typography.bodyFamily,

                    fontSize:
                        compact
                            ? 8.5
                            : 9.5,

                    color:
                        colors.textSecondary,

                    margin:
                        0,

                    valign:
                        "top",

                    fit:
                        "shrink"
                }
            );

        }
    );

};


// =========================================================
// NORMALIZE COMPARISON ITEM
// =========================================================

const normalizeComparisonItem = (
    item
) => {

    if (
        typeof item !== "object" ||
        item === null
    ) {

        return {
            label: "",
            points: []
        };

    }


    return {

        label:
            getText(
                item.label
            ),

        points:
            safeArray(
                item.points
            )
                .map(
                    getText
                )
                .filter(Boolean)

    };

};


// =========================================================
// MEANINGFUL ITEM CHECK
// =========================================================

const hasMeaningfulComparisonItem = (
    item
) => {

    return Boolean(
        item.label ||
        item.points.length > 0
    );

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
        "No comparison data was provided.",
        {
            x: 0.8,
            y: 3.2,
            w: 11.7,
            h: 0.5,

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


// =========================================================
// TEXT NORMALIZATION
// =========================================================

const getText = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value.trim();

};