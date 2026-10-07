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
// CARDS GRID
// =========================================================
//
// slideType:
//      cards
//
// layoutId:
//      cards-grid
//
// Canonical content:
//
// content: {
//
//     cards: [
//         {
//             title: "string",
//             description: "string"
//         }
//     ]
//
// }
//
// Purpose:
//
// Displays a collection of distinct but equally important
// concepts in a compact grid.
//
// This layout is best suited to larger card collections.
//
// =========================================================

export const renderCardsGrid = ({
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

    const cards =
        safeArray(
            slideData?.content?.cards
        )
            .map(
                normalizeCard
            )
            .filter(
                hasMeaningfulCard
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
        cards.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. GRID CONFIGURATION
    // =====================================================

    const columns =
        cards.length <= 4
            ? 2
            : 3;


    const rows =
        Math.ceil(
            cards.length /
            columns
        );


    const startX =
        0.72;


    const startY =
        1.65;


    const totalWidth =
        11.89;


    const totalHeight =
        4.95;


    const gapX =
        0.22;


    const gapY =
        0.22;


    const cardWidth =
        (
            totalWidth -
            gapX *
            (columns - 1)
        ) /
        columns;


    const cardHeight =
        (
            totalHeight -
            gapY *
            (rows - 1)
        ) /
        rows;


    // =====================================================
    // 6. RENDER CARDS
    // =====================================================

    cards.forEach(
        (
            card,
            index
        ) => {

            const column =
                index %
                columns;


            const row =
                Math.floor(
                    index /
                    columns
                );


            const x =
                startX +
                column *
                (
                    cardWidth +
                    gapX
                );


            const y =
                startY +
                row *
                (
                    cardHeight +
                    gapY
                );


            // =============================================
            // CARD SURFACE
            // =============================================

            addCard(
                slide,
                pptx,
                tokens,
                {
                    x,
                    y,
                    w: cardWidth,
                    h: cardHeight
                }
            );


            // =============================================
            // ACCENT MARKER
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x:
                        x + 0.25,

                    y:
                        y + 0.28,

                    w: 0.07,

                    h: 0.48,

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
            // CARD TITLE
            // =============================================

            if (
                card.title
            ) {

                slide.addText(
                    card.title,
                    {
                        x:
                            x + 0.52,

                        y:
                            y + 0.25,

                        w:
                            cardWidth -
                            0.82,

                        h: 0.55,

                        fontFace:
                            typography.headingFamily,

                        fontSize:
                            columns === 3
                                ? 13
                                : 15,

                        bold: true,

                        color:
                            colors.textPrimary,

                        margin: 0,

                        fit: "shrink"
                    }
                );

            }


            // =============================================
            // CARD DESCRIPTION
            // =============================================

            if (
                card.description
            ) {

                slide.addText(
                    card.description,
                    {
                        x:
                            x + 0.52,

                        y:
                            y + 0.95,

                        w:
                            cardWidth -
                            0.82,

                        h:
                            Math.max(
                                cardHeight -
                                1.25,
                                0.55
                            ),

                        fontFace:
                            typography.bodyFamily,

                        fontSize:
                            columns === 3
                                ? 9.5
                                : 10.5,

                        color:
                            colors.textSecondary,

                        margin: 0,

                        valign: "top",

                        fit: "shrink"
                    }
                );

            }

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE CARD
// =========================================================

const normalizeCard = (
    card
) => {

    if (
        typeof card !== "object" ||
        card === null
    ) {

        return {
            title: "",
            description: ""
        };

    }


    return {

        title:
            getText(
                card.title
            ),

        description:
            getText(
                card.description
            )

    };

};


// =========================================================
// MEANINGFUL CARD CHECK
// =========================================================

const hasMeaningfulCard = (
    card
) => {

    return Boolean(
        card.title ||
        card.description
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
        "No card content was provided.",
        {
            x: 0.8,
            y: 3.2,
            w: 11.7,
            h: 0.5,

            fontFace:
                typography.bodyFamily,

            fontSize: 12,

            color:
                colors.textMuted,

            align: "center",

            margin: 0
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