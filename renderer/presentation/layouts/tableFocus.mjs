import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// TABLE FOCUS
// =========================================================
//
// slideType:
//      table
//
// layoutId:
//      table-focus
//
// Canonical content:
//
// content: {
//
//     table: {
//
//         columns: [
//             "string"
//         ],
//
//         rows: [
//             [
//                 "string"
//             ]
//         ]
//
//     }
//
// }
//
// Purpose:
//
// Displays structured information where exact
// row-and-column comparison is important.
//
// The renderer does NOT invent missing table data.
// It only renders valid data supplied through the
// canonical presentation content schema.
//
// =========================================================

export const renderTableFocus = ({
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
    // 3. NORMALIZE TABLE DATA
    // =====================================================

    const table =
        normalizeTable(
            slideData?.content?.table
        );


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (!table) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. BUILD POWERPOINT TABLE ROWS
    // =====================================================

    const rows = [

        // =================================================
        // HEADER
        // =================================================

        table.columns.map(
            (column) => ({

                text:
                    String(column),

                options: {

                    bold:
                        true,

                    color:
                        colors.background,

                    fill:
                        colors.accentPrimary,

                    align:
                        "center",

                    valign:
                        "mid"

                }

            })
        ),


        // =================================================
        // BODY
        // =================================================

        ...table.rows.map(
            (row) =>

                row.map(
                    (cell) => ({

                        text:
                            String(
                                cell ?? ""
                            ),

                        options: {

                            color:
                                colors.textPrimary,

                            fill:
                                colors.surface,

                            valign:
                                "mid"

                        }

                    })
                )

        )

    ];


    // =====================================================
    // 6. DETERMINE TABLE FONT SIZE
    // =====================================================

    const fontSize =
        resolveTableFontSize(
            table.columns.length,
            table.rows.length
        );


    // =====================================================
    // 7. RENDER TABLE
    // =====================================================

    slide.addTable(
        rows,
        {
            x: 0.72,
            y: 1.65,
            w: 11.9,
            h: 4.95,

            border: {
                type:
                    "solid",

                color:
                    colors.border,

                pt:
                    0.7
            },

            fontFace:
                typography.bodyFamily,

            fontSize,

            color:
                colors.textPrimary,

            fill:
                colors.surface,

            margin:
                0.08,

            valign:
                "mid",

            autoFit:
                false,

            breakLine:
                false
        }
    );


    return slide;

};


// =========================================================
// NORMALIZE TABLE
// =========================================================
//
// Canonical input:
//
// {
//     columns: [...],
//     rows: [
//         [...],
//         [...]
//     ]
// }
//
// No alternative table structures are interpreted here.
//
// =========================================================

const normalizeTable = (
    table
) => {

    if (
        !table ||
        typeof table !== "object"
    ) {

        return null;

    }


    // =====================================================
    // COLUMNS
    // =====================================================

    const columns =
        safeArray(
            table.columns
        )
            .map(
                normalizeCell
            )
            .filter(
                (column) =>
                    column.length > 0
            );


    if (
        columns.length === 0
    ) {

        return null;

    }


    // =====================================================
    // PRESENTATION SAFETY LIMIT
    // =====================================================
    //
    // Very wide tables become unreadable on slides.
    //
    // The validator should normally prevent excessive
    // content before rendering, but the renderer still
    // protects itself.
    //
    // =====================================================

    const limitedColumns =
        columns.slice(
            0,
            7
        );


    // =====================================================
    // ROWS
    // =====================================================

    const rawRows =
        safeArray(
            table.rows
        );


    if (
        rawRows.length === 0
    ) {

        return null;

    }


    const rows =
        rawRows
            .filter(
                (row) =>
                    Array.isArray(row)
            )
            .slice(
                0,
                10
            )
            .map(
                (row) =>
                    normalizeRow(
                        row,
                        limitedColumns.length
                    )
            );


    if (
        rows.length === 0
    ) {

        return null;

    }


    return {

        columns:
            limitedColumns,

        rows

    };

};


// =========================================================
// NORMALIZE ROW
// =========================================================
//
// Every rendered row must have exactly the same number
// of cells as the rendered column count.
//
// Missing cells are rendered as empty strings.
//
// Extra cells are discarded because there is no matching
// column.
//
// This is structural normalization only. It does NOT
// invent factual content.
//
// =========================================================

const normalizeRow = (
    row,
    columnCount
) => {

    const normalized =
        row
            .slice(
                0,
                columnCount
            )
            .map(
                normalizeCell
            );


    while (
        normalized.length <
        columnCount
    ) {

        normalized.push("");

    }


    return normalized;

};


// =========================================================
// NORMALIZE CELL
// =========================================================

const normalizeCell = (
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
        typeof value === "number" ||
        typeof value === "boolean"
    ) {

        return String(value);

    }


    return String(value);

};


// =========================================================
// TABLE FONT SIZE
// =========================================================
//
// Reduce font size conservatively as table density grows.
//
// This is only a rendering decision.
// It does not remove or rewrite table content.
//
// =========================================================

const resolveTableFontSize = (
    columnCount,
    rowCount
) => {

    if (
        columnCount >= 6 ||
        rowCount >= 9
    ) {

        return 8.5;

    }


    if (
        columnCount >= 5 ||
        rowCount >= 7
    ) {

        return 9;

    }


    return 10;

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
        "Table data is unavailable.",
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