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
// CARDS HORIZONTAL
// =========================================================
//
// slideType:
//      cards
//
// layoutId:
//      cards-horizontal
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
// Displays a small collection of equally important items
// horizontally.
//
// Best suited to approximately 2–4 cards.
//
// =========================================================

export const renderCardsHorizontal = ({
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
    // 5. LAYOUT GEOMETRY
    // =====================================================

    const startX =
        0.72;


    const totalWidth =
        11.89;


    const gap =
        0.22;


    const cardWidth =
        (
            totalWidth -
            gap *
            (cards.length - 1)
        ) /
        cards.length;


    // =====================================================
    // 6. RENDER CARDS
    // =====================================================

    cards.forEach(
        (
            card,
            index
        ) => {

            const x =
                startX +
                index *
                (
                    cardWidth +
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
                    y: 1.75,
                    w: cardWidth,
                    h: 4.65
                }
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
                    x:
                        x + 0.3,

                    y: 2.05,

                    w: 0.55,

                    h: 0.35,

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
            // ACCENT
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x:
                        x + 0.3,

                    y: 2.62,

                    w: 0.58,

                    h: 0.05,

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
            // CARD TITLE
            // =============================================

            if (
                card.title
            ) {

                slide.addText(
                    card.title,
                    {
                        x:
                            x + 0.3,

                        y: 3.05,

                        w:
                            cardWidth -
                            0.6,

                        h: 0.82,

                        fontFace:
                            typography.headingFamily,

                        fontSize:
                            cards.length === 4
                                ? 14
                                : 16,

                        bold: true,

                        color:
                            colors.textPrimary,

                        margin: 0,

                        valign: "mid",

                        fit: "shrink"
                    }
                );

            }


            // =============================================
            // DESCRIPTION
            // =============================================

            if (
                card.description
            ) {

                slide.addText(
                    card.description,
                    {
                        x:
                            x + 0.3,

                        y: 4.15,

                        w:
                            cardWidth -
                            0.6,

                        h: 1.45,

                        fontFace:
                            typography.bodyFamily,

                        fontSize:
                            cards.length === 4
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