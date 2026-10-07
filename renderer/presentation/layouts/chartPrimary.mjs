import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    normalizeColor,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// CHART PRIMARY
// =========================================================
//
// slideType:
//      data-chart
//
// layoutId:
//      chart-primary
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
// Gives the chart the majority of the slide area.
//
// Used when the chart itself is the primary communication
// element and there is no substantial written insight.
//
// =========================================================

export const renderChartPrimary = ({
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
    // 3. NORMALIZE CHART DATA
    // =====================================================

    const chart =
        normalizeChartData(
            slideData?.content?.chart
        );


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (!chart) {

        renderNoChartData(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. RESOLVE POWERPOINT CHART TYPE
    // =====================================================

    const chartType =
        resolveChartType(
            chart.chartType,
            pptx
        );


    // =====================================================
    // 6. CHART OPTIONS
    // =====================================================

    const isCircularChart =
        chart.chartType === "pie" ||
        chart.chartType === "doughnut";


    const chartOptions = {

        x: 0.85,
        y: 1.65,
        w: 11.65,
        h: 4.95,

        showTitle: false,

        showLegend:
            isCircularChart ||
            chart.series.length > 1,

        legendPos:
            isCircularChart
                ? "r"
                : "b",

        showBorder: false,

        chartColors:
            getChartPalette(
                tokens
            ),

        catAxisLabelFontFace:
            typography.bodyFamily,

        catAxisLabelFontSize:
            10,

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
            false

    };


    // =====================================================
    // 7. PIE / DOUGHNUT OPTIONS
    // =====================================================

    if (isCircularChart) {

        chartOptions.dataLabelPosition =
            "bestFit";

    }


    // =====================================================
    // 8. ADD CHART
    // =====================================================

    slide.addChart(
        chartType,
        chart.series,
        chartOptions
    );


    return slide;

};


// =========================================================
// NORMALIZE CHART DATA
// =========================================================
//
// Converts our canonical application schema:
//
// labels + datasets
//
// into the series structure expected by PptxGenJS.
//
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
    // CONVERT DATASETS TO PPTX SERIES
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


                    // Every dataset must correspond
                    // exactly to the category labels.

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
// NO DATA STATE
// =========================================================

const renderNoChartData = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "Chart data is unavailable.",
        {
            x: 0.8,
            y: 3.25,
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