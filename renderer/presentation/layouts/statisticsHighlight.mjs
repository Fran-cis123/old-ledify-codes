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
// STATISTICS HIGHLIGHT
// =========================================================
//
// slideType:
//      statistics
//
// layoutId:
//      statistics-highlight
//
// Canonical content:
//
// content: {
//
//     statistics: [
//
//         {
//             value: "string",
//             label: "string",
//             context: "string"
//         }
//
//     ]
//
// }
//
// Purpose:
//
// Highlights a small number of important quantitative
// values, measurements, percentages, or indicators.
//
// IMPORTANT:
//
// This renderer does not calculate, infer, estimate,
// generate, or invent statistical values.
//
// It only renders statistics already present in the
// validated presentation content.
//
// =========================================================

export const renderStatisticsHighlight = ({
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
    // 3. NORMALIZE STATISTICS
    // =====================================================

    const statistics =
        normalizeStatistics(
            slideData?.content?.statistics
        )
            .slice(
                0,
                4
            );


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (
        statistics.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );


        return slide;

    }


    // =====================================================
    // 5. LAYOUT CALCULATION
    // =====================================================

    const startX =
        0.75;


    const totalWidth =
        11.83;


    const gap =
        0.22;


    const cardWidth =
        (
            totalWidth -
            gap *
            (
                statistics.length -
                1
            )
        ) /
        statistics.length;


    // =====================================================
    // 6. RENDER STATISTIC CARDS
    // =====================================================

    statistics.forEach(
        (
            statistic,
            index
        ) => {

            const x =
                startX +
                index *
                (
                    cardWidth +
                    gap
                );


            // =================================================
            // CARD
            // =================================================

            addCard(
                slide,
                pptx,
                tokens,
                {
                    x,
                    y: 1.85,
                    w: cardWidth,
                    h: 4.35
                }
            );


            // =================================================
            // TOP ACCENT
            // =================================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x:
                        x +
                        0.28,

                    y:
                        2.18,

                    w:
                        0.7,

                    h:
                        0.055,

                    line: {
                        transparency:
                            100
                    },

                    fill: {
                        color:
                            index % 2 === 0
                                ? colors.accentPrimary
                                : colors.accentSecondary
                    }
                }
            );


            // =================================================
            // VALUE
            // =================================================

            slide.addText(
                statistic.value,
                {
                    x:
                        x +
                        0.28,

                    y:
                        2.7,

                    w:
                        cardWidth -
                        0.56,

                    h:
                        1.1,

                    fontFace:
                        typography.headingFamily,

                    fontSize:
                        resolveValueFontSize(
                            statistic.value,
                            typography
                        ),

                    bold:
                        true,

                    color:
                        colors.textPrimary,

                    margin:
                        0,

                    fit:
                        "shrink"
                }
            );


            // =================================================
            // LABEL
            // =================================================

            if (
                statistic.label
            ) {

                slide.addText(
                    statistic.label,
                    {
                        x:
                            x +
                            0.28,

                        y:
                            4.05,

                        w:
                            cardWidth -
                            0.56,

                        h:
                            0.55,

                        fontFace:
                            typography.headingFamily,

                        fontSize:
                            12,

                        bold:
                            true,

                        color:
                            colors.textPrimary,

                        margin:
                            0,

                        fit:
                            "shrink"
                    }
                );

            }


            // =================================================
            // CONTEXT
            // =================================================

            if (
                statistic.context
            ) {

                slide.addText(
                    statistic.context,
                    {
                        x:
                            x +
                            0.28,

                        y:
                            4.82,

                        w:
                            cardWidth -
                            0.56,

                        h:
                            0.85,

                        fontFace:
                            typography.bodyFamily,

                        fontSize:
                            9.5,

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

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE STATISTICS
// =========================================================
//
// Canonical input:
//
// [
//     {
//         value: "42%",
//         label: "Conversion Rate",
//         context: "Observed during the test period"
//     }
// ]
//
// No alternative statistics structures are interpreted.
//
// =========================================================

const normalizeStatistics = (
    statistics
) => {

    return safeArray(
        statistics
    )
        .filter(
            (
                statistic
            ) => {

                return (
                    statistic &&
                    typeof statistic ===
                        "object" &&
                    !Array.isArray(
                        statistic
                    )
                );

            }
        )
        .map(
            (
                statistic
            ) => {

                return {

                    value:
                        normalizeValue(
                            statistic.value
                        ),

                    label:
                        normalizeText(
                            statistic.label
                        ),

                    context:
                        normalizeText(
                            statistic.context
                        )

                };

            }
        )
        .filter(
            (
                statistic
            ) =>
                statistic.value
                    .length > 0
        );

};


// =========================================================
// NORMALIZE VALUE
// =========================================================
//
// Values are represented as strings in the canonical
// schema because presentation statistics may include:
//
// 42%
// $2.4M
// 3.7×
// 450,000
// 18 months
//
// The renderer preserves the supplied value.
//
// =========================================================

const normalizeValue = (
    value
) => {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    if (
        typeof value === "string"
    ) {

        return value.trim();

    }


    if (
        typeof value === "number"
    ) {

        return String(value);

    }


    return "";

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
// VALUE FONT SIZE
// =========================================================
//
// Large statistics should dominate the card.
//
// Longer supplied values receive slightly smaller initial
// font sizes before PowerPoint's shrink fitting is applied.
//
// =========================================================

const resolveValueFontSize = (
    value,
    typography
) => {

    const length =
        String(value)
            .length;


    const baseSize =
        Math.max(
            typography.statisticSize ||
                28,
            28
        );


    if (
        length <= 6
    ) {

        return baseSize;

    }


    if (
        length <= 12
    ) {

        return Math.min(
            baseSize,
            26
        );

    }


    return Math.min(
        baseSize,
        22
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
        "No statistical values were provided.",
        {
            x:
                0.8,

            y:
                3.2,

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