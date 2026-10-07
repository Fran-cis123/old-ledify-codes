import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    addCard,
    getColors,
    getTypography,
    normalizeColor,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// CHART WITH INSIGHT
// =========================================================
//
// slideType:
//      data-chart
//
// layoutId:
//      chart-with-insight
//
// Canonical content:
//
// content: {
//
//     chart: {
//
//         chartType: "string",
//
//         labels: [
//             "string"
//         ],
//
//         datasets: [
//             {
//                 label: "string",
//                 values: [
//                     "number"
//                 ]
//             }
//         ],
//
//         insight: "string"
//
//     }
//
// }
//
// Purpose:
//
// Displays quantitative data together with a meaningful
// written interpretation.
//
// Left:
//      chart
//
// Right:
//      key insight
//
// =========================================================

export const renderChartWithInsight = ({
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
    // 2. CANONICAL CHART CONTENT
    // =====================================================

    const rawChart =
        slideData?.content?.chart;


    const chart =
        normalizeChartData(
            rawChart
        );


    const insight =
        normalizeInsight(
            rawChart?.insight
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
    // 4. LEFT SIDE — CHART
    // =====================================================

    if (chart) {

        const chartType =
            resolveChartType(
                chart.chartType,
                pptx
            );


        const isCircularChart =
            chart.chartType === "pie" ||
            chart.chartType ===
                "doughnut";


        slide.addChart(
            chartType,
            chart.series,
            {
                x: 0.75,
                y: 1.72,
                w: 7.65,
                h: 4.75,

                showTitle:
                    false,

                showLegend:
                    isCircularChart ||
                    chart.series.length > 1,

                legendPos:
                    isCircularChart
                        ? "r"
                        : "b",

                showBorder:
                    false,

                chartColors:
                    getChartPalette(
                        tokens
                    ),

                catAxisLabelFontFace:
                    typography.bodyFamily,

                catAxisLabelFontSize:
                    9,

                valAxisLabelFontFace:
                    typography.bodyFamily,

                valAxisLabelFontSize:
                    9,

                showValue:
                    isCircularChart,

                showPercent:
                    isCircularChart,

                showCatName:
                    false,

                showSerName:
                    false,

                ...(isCircularChart
                    ? {
                        dataLabelPosition:
                            "bestFit"
                    }
                    : {})
            }
        );

    } else {

        renderNoChartData(
            slide,
            colors,
            typography
        );

    }


    // =====================================================
    // 5. RIGHT SIDE — INSIGHT CARD
    // =====================================================

    addCard(
        slide,
        pptx,
        tokens,
        {
            x: 8.75,
            y: 1.72,
            w: 3.82,
            h: 4.75
        }
    );


    // =====================================================
    // 6. INSIGHT LABEL
    // =====================================================

    slide.addText(
        "KEY INSIGHT",
        {
            x: 9.08,
            y: 2.08,
            w: 3.15,
            h: 0.28,

            fontFace:
                typography.bodyFamily,

            fontSize:
                8,

            bold:
                true,

            charSpacing:
                1.2,

            color:
                colors.accentPrimary,

            margin:
                0
        }
    );


    // =====================================================
    // 7. INSIGHT ACCENT
    // =====================================================

    slide.addShape(
        pptx.ShapeType.rect,
        {
            x: 9.08,
            y: 2.58,
            w: 0.62,
            h: 0.055,

            line: {
                transparency: 100
            },

            fill: {
                color:
                    colors.accentPrimary
            }
        }
    );


    // =====================================================
    // 8. INSIGHT TEXT
    // =====================================================

    slide.addText(
        insight ||
        "No interpretation was provided for this chart.",
        {
            x: 9.08,
            y: 3.05,
            w: 3.15,
            h: 2.55,

            fontFace:
                insight
                    ? typography.headingFamily
                    : typography.bodyFamily,

            fontSize:
                insight
                    ? 15
                    : 11,

            bold:
                Boolean(
                    insight
                ),

            color:
                insight
                    ? colors.textPrimary
                    : colors.textMuted,

            margin:
                0,

            valign:
                "mid",

            fit:
                "shrink"
        }
    );


    return slide;

};


// =========================================================
// NORMALIZE CHART DATA
// =========================================================

const normalizeChartData = (
    chart
) => {

    if (
        !chart ||
        typeof chart !== "object"
    ) {

        return null;

    }


    // =====================================================
    // CHART TYPE
    // =====================================================

    const chartType =
        normalizeChartType(
            chart.chartType
        );


    // =====================================================
    // LABELS
    // =====================================================

    const labels =
        safeArray(
            chart.labels
        )
            .map(
                (label) =>
                    String(label)
            );


    if (
        labels.length === 0
    ) {

        return null;

    }


    // =====================================================
    // DATASETS
    // =====================================================

    const datasets =
        safeArray(
            chart.datasets
        );


    if (
        datasets.length === 0
    ) {

        return null;

    }


    // =====================================================
    // PPTX SERIES
    // =====================================================

    const series =
        datasets
            .map(
                (
                    dataset,
                    index
                ) => {

                    if (
                        !dataset ||
                        typeof dataset !==
                            "object"
                    ) {

                        return null;

                    }


                    const values =
                        safeArray(
                            dataset.values
                        )
                            .map(
                                (value) =>
                                    Number(value)
                            );


                    if (
                        values.length !==
                        labels.length
                    ) {

                        return null;

                    }


                    if (
                        values.some(
                            (value) =>
                                !Number.isFinite(
                                    value
                                )
                        )
                    ) {

                        return null;

                    }


                    return {

                        name:
                            normalizeDatasetLabel(
                                dataset.label,
                                index
                            ),

                        labels:
                            [...labels],

                        values

                    };

                }
            )
            .filter(Boolean);


    if (
        series.length === 0
    ) {

        return null;

    }


    return {

        chartType,

        series

    };

};


// =========================================================
// NORMALIZE CHART TYPE
// =========================================================

const normalizeChartType = (
    chartType
) => {

    const normalized =
        String(
            chartType ||
            "bar"
        )
            .trim()
            .toLowerCase();


    const supportedTypes = [
        "bar",
        "column",
        "line",
        "pie",
        "doughnut",
        "area"
    ];


    if (
        supportedTypes.includes(
            normalized
        )
    ) {

        return normalized;

    }


    return "bar";

};


// =========================================================
// DATASET LABEL
// =========================================================

const normalizeDatasetLabel = (
    label,
    index
) => {

    if (
        typeof label === "string" &&
        label.trim()
    ) {

        return label.trim();

    }


    return `Series ${index + 1}`;

};


// =========================================================
// INSIGHT
// =========================================================

const normalizeInsight = (
    insight
) => {

    if (
        typeof insight !== "string"
    ) {

        return "";

    }


    return insight.trim();

};


// =========================================================
// RESOLVE PPTX CHART TYPE
// =========================================================

const resolveChartType = (
    chartType,
    pptx
) => {

    switch (chartType) {

        case "line":

            return pptx.ChartType.line;


        case "pie":

            return pptx.ChartType.pie;


        case "doughnut":

            return pptx.ChartType.doughnut;


        case "area":

            return pptx.ChartType.area;


        case "column":

            return pptx.ChartType.bar;


        case "bar":
        default:

            return pptx.ChartType.bar;

    }

};


// =========================================================
// CHART PALETTE
// =========================================================

const getChartPalette = (
    tokens
) => {

    const palette =
        safeArray(
            tokens?.chartPalette
        );


    if (
        palette.length > 0
    ) {

        return palette.map(
            (color) =>
                normalizeColor(
                    color
                )
        );

    }


    const colors =
        getColors(tokens);


    return [
        colors.accentPrimary,
        colors.accentSecondary,
        colors.textSecondary,
        colors.border
    ];

};


// =========================================================
// NO CHART DATA
// =========================================================

const renderNoChartData = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "Chart data is unavailable.",
        {
            x: 0.75,
            y: 3.4,
            w: 7.65,
            h: 0.4,

            fontFace:
                typography.bodyFamily,

            fontSize:
                11,

            color:
                colors.textMuted,

            align:
                "center",

            margin:
                0
        }
    );

};