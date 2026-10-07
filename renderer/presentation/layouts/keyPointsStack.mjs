import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// KEY POINTS STACK
// =========================================================
//
// Used by list-oriented slide types such as:
//
//      agenda
//      key-points
//      recommendation
//      next-steps
//
// Canonical content:
//
// content: {
//
//     items: [
//         {
//             title: "string",
//             description: "string"
//         }
//     ]
//
// }
//
// =========================================================

export const renderKeyPointsStack = ({
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
    // 2. CANONICAL CONTENT
    // =====================================================

    const items =
        safeArray(
            slideData?.content?.items
        )
            .map(
                normalizeItem
            )
            .filter(
                hasMeaningfulItem
            )
            .slice(
                0,
                6
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

        slide.addText(
            "No list items were provided.",
            {
                x: 0.8,
                y: 2,
                w: 11.5,
                h: 0.5,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    typography.bodySize,

                color:
                    colors.textMuted,

                margin: 0
            }
        );


        return slide;

    }


    // =====================================================
    // 5. STACK GEOMETRY
    // =====================================================

    const startY =
        1.65;


    const availableHeight =
        4.95;


    const gap =
        0.12;


    const itemHeight =
        Math.min(
            0.9,
            (
                availableHeight -
                gap *
                (items.length - 1)
            ) /
            items.length
        );


    // =====================================================
    // 6. RENDER ITEMS
    // =====================================================

    items.forEach(
        (
            item,
            index
        ) => {

            const y =
                startY +
                index *
                (
                    itemHeight +
                    gap
                );


            // =============================================
            // NUMBER
            // =============================================

            slide.addText(
                String(
                    index + 1
                )
                    .padStart(
                        2,
                        "0"
                    ),
                {
                    x: 0.78,
                    y: y + 0.12,
                    w: 0.55,
                    h: 0.3,

                    fontFace:
                        typography.headingFamily,

                    fontSize: 11,

                    bold: true,

                    color:
                        colors.accentPrimary,

                    margin: 0
                }
            );


            // =============================================
            // DIVIDER
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x: 1.52,
                    y: y + 0.08,
                    w: 0.04,

                    h:
                        Math.max(
                            itemHeight -
                            0.16,
                            0.3
                        ),

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            colors.border
                    }
                }
            );


            // =============================================
            // TITLE
            // =============================================

            slide.addText(
                item.title,
                {
                    x: 1.85,
                    y: y + 0.08,
                    w: 3.25,
                    h: 0.3,

                    fontFace:
                        typography.headingFamily,

                    fontSize: 13,

                    bold: true,

                    color:
                        colors.textPrimary,

                    margin: 0,

                    fit: "shrink"
                }
            );


            // =============================================
            // DESCRIPTION
            // =============================================

            if (
                item.description
            ) {

                slide.addText(
                    item.description,
                    {
                        x: 5.35,
                        y: y + 0.08,
                        w: 6.75,

                        h:
                            Math.max(
                                itemHeight -
                                0.16,
                                0.35
                            ),

                        fontFace:
                            typography.bodyFamily,

                        fontSize: 10.5,

                        color:
                            colors.textSecondary,

                        margin: 0,

                        valign: "mid",

                        fit: "shrink"
                    }
                );

            }

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE ITEM
// =========================================================

const normalizeItem = (
    item
) => {

    if (
        typeof item === "string"
    ) {

        return {
            title:
                item.trim(),

            description:
                ""
        };

    }


    if (
        typeof item !== "object" ||
        item === null
    ) {

        return {
            title: "",
            description: ""
        };

    }


    return {

        title:
            getText(
                item.title
            ),

        description:
            getText(
                item.description
            )

    };

};


// =========================================================
// MEANINGFUL ITEM CHECK
// =========================================================

const hasMeaningfulItem = (
    item
) => {

    return Boolean(
        item.title ||
        item.description
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