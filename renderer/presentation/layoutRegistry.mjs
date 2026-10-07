// =========================================================
// PRESENTATION LAYOUT REGISTRY
// =========================================================
//
// Every presentation layout renderer is registered here.
//
// presentationLayoutService:
//      decides WHICH layout should be used.
//
// layoutRegistry:
//      connects that layoutId to the function that
//      actually draws the PowerPoint slide.
//
// =========================================================


// =========================================================
// TITLE
// =========================================================

import {
    renderTitleCentered
} from "./layouts/titleCentered.mjs";


import {
    renderTitleSplit
} from "./layouts/titleSplit.mjs";


// =========================================================
// SECTION DIVIDER
// =========================================================

import {
    renderSectionDividerCentered
} from "./layouts/sectionDividerCentered.mjs";


// =========================================================
// TEXT / EXPLANATION
// =========================================================

import {
    renderFocusedStatement
} from "./layouts/focusedStatement.mjs";


import {
    renderTextVisualSplit
} from "./layouts/textVisualSplit.mjs";


// =========================================================
// KEY POINTS
// =========================================================

import {
    renderKeyPointsStack
} from "./layouts/keyPointsStack.mjs";


// =========================================================
// CARDS
// =========================================================

import {
    renderCardsGrid
} from "./layouts/cardsGrid.mjs";


import {
    renderCardsHorizontal
} from "./layouts/cardsHorizontal.mjs";


// =========================================================
// PROCESS
// =========================================================

import {
    renderProcessHorizontal
} from "./layouts/processHorizontal.mjs";


import {
    renderProcessVertical
} from "./layouts/processVertical.mjs";


// =========================================================
// COMPARISON
// =========================================================

import {
    renderComparisonTwoColumn
} from "./layouts/contentTwoColumn.mjs";

import {
    renderComparisonMultiColumn
} from "./layouts/comparisonMultiColumn.mjs";


// =========================================================
// TIMELINE / ROADMAP
// =========================================================

import {
    renderTimelineHorizontal
} from "./layouts/timelineHorizontal.mjs";


import {
    renderRoadmapPhases
} from "./layouts/roadmapPhases.mjs";


// =========================================================
// STATISTICS
// =========================================================

import {
    renderStatisticsHighlight
} from "./layouts/statisticsHighlight.mjs";


// =========================================================
// DATA CHART
// =========================================================

import {
    renderChartPrimary
} from "./layouts/chartPrimary.mjs";


import {
    renderChartWithInsight
} from "./layouts/chartWithInsight.mjs";


// =========================================================
// TABLE
// =========================================================

import {
    renderTableFocus
} from "./layouts/tableFocus.mjs";


// =========================================================
// RELATIONSHIP
// =========================================================

import {
    renderRelationshipNetwork
} from "./layouts/relationshipNetwork.mjs";


// =========================================================
// QUOTE
// =========================================================

import {
    renderQuoteEmphasis
} from "./layouts/quoteEmphasis.mjs";


// =========================================================
// CASE STUDY
// =========================================================

import {
    renderCaseStudyFlow
} from "./layouts/caseStudyFlow.mjs";


// =========================================================
// CALL TO ACTION
// =========================================================

import {
    renderCtaFocus
} from "./layouts/ctaFocus.mjs";


// =========================================================
// FALLBACK
// =========================================================

import {
    renderFallbackLayout
} from "./layouts/fallbackLayout.mjs";


// =========================================================
// LAYOUT REGISTRY
// =========================================================

const layoutRegistry = {


    // =====================================================
    // TITLE
    // =====================================================

    "title-centered":
        renderTitleCentered,

    "title-split":
        renderTitleSplit,


    // =====================================================
    // SECTION DIVIDER
    // =====================================================

    "section-divider-centered":
        renderSectionDividerCentered,


    // =====================================================
    // TEXT / EXPLANATION
    // =====================================================

    "focused-statement":
        renderFocusedStatement,

    "text-visual-split":
        renderTextVisualSplit,


    // =====================================================
    // KEY POINTS
    // =====================================================

    "key-points-stack":
        renderKeyPointsStack,


    // =====================================================
    // CARDS
    // =====================================================

    "cards-grid":
        renderCardsGrid,

    "cards-horizontal":
        renderCardsHorizontal,


    // =====================================================
    // PROCESS
    // =====================================================

    "process-horizontal":
        renderProcessHorizontal,

    "process-vertical":
        renderProcessVertical,


    // =====================================================
    // COMPARISON
    // =====================================================
    "comparison-two-column":
        renderComparisonTwoColumn,

    "comparison-multi-column":
        renderComparisonMultiColumn,


    // =====================================================
    // TIMELINE / ROADMAP
    // =====================================================

    "timeline-horizontal":
        renderTimelineHorizontal,

    "roadmap-phases":
        renderRoadmapPhases,


    // =====================================================
    // STATISTICS
    // =====================================================

    "statistics-highlight":
        renderStatisticsHighlight,


    // =====================================================
    // DATA CHART
    // =====================================================

    "chart-primary":
        renderChartPrimary,

    "chart-with-insight":
        renderChartWithInsight,


    // =====================================================
    // TABLE
    // =====================================================

    "table-focus":
        renderTableFocus,


    // =====================================================
    // RELATIONSHIP
    // =====================================================

    "relationship-network":
        renderRelationshipNetwork,


    // =====================================================
    // QUOTE
    // =====================================================

    "quote-emphasis":
        renderQuoteEmphasis,


    // =====================================================
    // CASE STUDY
    // =====================================================

    "case-study-flow":
        renderCaseStudyFlow,


    // =====================================================
    // CALL TO ACTION
    // =====================================================

    "cta-focus":
        renderCtaFocus

};


// =========================================================
// RENDER LAYOUT
// =========================================================

export const renderLayout = ({

    slide,
    slideData,
    tokens,
    pptx

}) => {

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!slide) {

        throw new Error(
            "PowerPoint slide instance is required"
        );

    }


    if (!slideData) {

        throw new Error(
            "Slide data is required"
        );

    }


    if (!tokens) {

        throw new Error(
            "Presentation design tokens are required"
        );

    }


    if (!slideData.layoutId) {

        throw new Error(
            `Slide ${slideData.slideNumber || ""} does not have a layoutId`
        );

    }


    // =====================================================
    // FIND REGISTERED RENDERER
    // =====================================================

    const renderer =
        layoutRegistry[
            slideData.layoutId
        ];


    // =====================================================
    // FALLBACK
    // =====================================================

    if (!renderer) {

        console.warn(
            `No renderer registered for layout "${slideData.layoutId}". Using fallback renderer.`
        );


        return renderFallbackLayout({

            slide,

            slideData,

            tokens,

            pptx

        });

    }


    // =====================================================
    // RENDER SELECTED LAYOUT
    // =====================================================

    return renderer({

        slide,

        slideData,

        tokens,

        pptx

    });

};


// =========================================================
// GET REGISTERED LAYOUT IDS
// =========================================================

export const getRegisteredLayoutIds = () => {

    return Object.keys(
        layoutRegistry
    );

};


// =========================================================
// CHECK WHETHER RENDERER EXISTS
// =========================================================

export const hasLayoutRenderer = (
    layoutId
) => {

    return Boolean(
        layoutRegistry[
            layoutId
        ]
    );

};