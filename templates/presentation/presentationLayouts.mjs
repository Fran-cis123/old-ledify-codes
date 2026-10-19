export const presentationLayouts = [
    {id:'title-editorial',slideTypes:['title'],description:'Typographic editorial opening with high contrast and no arbitrary artwork.'},
    {id:'closing-synthesis',slideTypes:['summary','conclusion'],description:'Dominant closing message with supporting implications.'},
    {id:'explanation-editorial',slideTypes:['focused-explanation'],description:'Lead explanation separated from its supporting sentences without changing content.'},
    {id:'relationship-chain-vertical',slideTypes:['relationship'],description:'A vertical chain of related entities with readable mechanisms and relationship labels.'},


    // =========================================================
    // TITLE LAYOUTS
    // =========================================================

    {
        id: "title-centered",

        slideTypes: ["title"],

        description:
            "A strong centered opening layout for presentations requiring a formal, balanced, and focused introduction.",

        composition: {
            titlePosition: "center",
            subtitlePosition: "below-title",
            visualEmphasis: "minimal",
            alignment: "center"
        },

        bestFor: [
            "academic presentations",
            "research defenses",
            "formal business presentations",
            "reports"
        ]
    },


    {
        id: "title-split",

        slideTypes: ["title"],

        description:
            "A split opening composition combining prominent introductory text with a supporting visual area.",

        composition: {
            titlePosition: "left",
            subtitlePosition: "below-title",
            visualPosition: "right",
            visualEmphasis: "high",
            alignment: "left"
        },

        bestFor: [
            "startup pitches",
            "product presentations",
            "creative presentations",
            "campaign presentations"
        ]
    },


    // =========================================================
    // SECTION DIVIDER LAYOUT
    // =========================================================

    {
        id: "section-divider-centered",

        slideTypes: [
            "section-divider"
        ],

        description:
            "A high-impact transitional layout used to introduce a new presentation section with minimal text and strong visual hierarchy.",

        composition: {
            titlePosition: "center",
            subtitlePosition: "below-title",
            alignment: "center",
            visualEmphasis: "medium"
        },

        bestFor: [
            "section transitions",
            "chapter introductions",
            "presentation phases",
            "major topic changes"
        ]
    },


    // =========================================================
    // TEXT / EXPLANATION LAYOUTS
    // =========================================================

    {
        id: "focused-statement",

        slideTypes: [
            "focused-explanation",
            "summary",
            "conclusion"
        ],

        description:
            "A restrained layout built around one dominant idea with supporting explanatory content.",

        composition: {
            contentWidth: "medium",
            alignment: "left",
            visualEmphasis: "low"
        },

        bestFor: [
            "important explanations",
            "research interpretation",
            "executive insights",
            "conclusions"
        ]
    },


    {
        id: "text-visual-split",

        slideTypes: [
            "text-visual",
            "focused-explanation"
        ],

        description:
            "A two-column composition balancing explanatory content with a meaningful supporting visual.",

        composition: {
            textPosition: "left",
            visualPosition: "right",
            ratio: "50-50",
            alignment: "left"
        },

        bestFor: [
            "concept explanations",
            "product introductions",
            "scientific concepts",
            "educational presentations"
        ]
    },


    // =========================================================
    // KEY POINT / LIST LAYOUTS
    // =========================================================

    {
        id: "key-points-stack",

        slideTypes: [
            "agenda",
            "key-points",
            "recommendation",
            "next-steps"
        ],

        description:
            "A vertically organized hierarchy of concise points designed for rapid scanning and clear prioritization.",

        composition: {
            direction: "vertical",
            alignment: "left",
            itemEmphasis: "balanced"
        },

        bestFor: [
            "objectives",
            "recommendations",
            "agendas",
            "next steps",
            "priorities"
        ]
    },


    // =========================================================
    // CARD LAYOUTS
    // =========================================================

    {
        id: "cards-grid",

        slideTypes: ["cards"],

        description:
            "A balanced grid for presenting multiple independent ideas with equal visual importance.",

        composition: {
            arrangement: "grid",
            preferredItems: "3-6",
            itemEmphasis: "equal"
        },

        bestFor: [
            "features",
            "limitations",
            "benefits",
            "principles",
            "categories"
        ]
    },


    {
        id: "cards-horizontal",

        slideTypes: ["cards"],

        description:
            "A horizontal card arrangement optimized for a small number of distinct ideas that benefit from side-by-side presentation.",

        composition: {
            arrangement: "horizontal",
            preferredItems: "2-4",
            itemEmphasis: "equal"
        },

        bestFor: [
            "strategic pillars",
            "research objectives",
            "service categories",
            "key concepts"
        ]
    },


    // =========================================================
    // PROCESS LAYOUTS
    // =========================================================

    {
        id: "process-horizontal",

        slideTypes: ["process"],

        description:
            "A sequential left-to-right process layout emphasizing progression through clearly defined stages.",

        composition: {
            direction: "horizontal",
            preferredSteps: "3-5",
            connectorStyle: "sequential"
        },

        bestFor: [
            "methodologies",
            "workflows",
            "procedures",
            "operational processes"
        ]
    },


    {
        id: "process-vertical",

        slideTypes: ["process"],

        description:
            "A top-to-bottom process layout suited to detailed stages requiring more explanatory space.",

        composition: {
            direction: "vertical",
            preferredSteps: "4-7",
            connectorStyle: "sequential"
        },

        bestFor: [
            "complex methodologies",
            "technical workflows",
            "multi-stage procedures"
        ]
    },


    // =========================================================
    // COMPARISON LAYOUTS
    // =========================================================

    {
        id: "comparison-two-column",

        slideTypes: ["comparison"],

        description:
            "A symmetrical two-column structure designed for direct comparison between two alternatives, groups, conditions, or approaches.",

        composition: {
            columns: 2,
            comparisonStyle: "parallel",
            alignment: "balanced"
        },

        bestFor: [
            "before versus after",
            "control versus treatment",
            "option comparisons",
            "advantages versus disadvantages"
        ]
    },


    {
        id: "comparison-multi-column",

        slideTypes: ["comparison"],

        description:
            "A multi-column comparison layout for evaluating three or more alternatives using consistent criteria.",

        composition: {
            columns: "3-4",
            comparisonStyle: "parallel",
            alignment: "balanced"
        },

        bestFor: [
            "product comparisons",
            "method comparisons",
            "strategic alternatives"
        ]
    },


    // =========================================================
    // TIMELINE / ROADMAP LAYOUTS
    // =========================================================

    {
        id: "timeline-horizontal",

        slideTypes: ["timeline"],

        description:
            "A chronological horizontal composition emphasizing progression across dates, periods, or historical stages.",

        composition: {
            direction: "horizontal",
            preferredEvents: "3-6",
            connectorStyle: "timeline"
        },

        bestFor: [
            "historical progression",
            "project chronology",
            "research timelines"
        ]
    },


    {
        id: "roadmap-phases",

        slideTypes: ["roadmap"],

        description:
            "A phased roadmap composition communicating planned progression, milestones, priorities, and future direction.",

        composition: {
            direction: "horizontal",
            preferredEvents: "3-6",
            connectorStyle: "phased"
        },

        bestFor: [
            "product roadmaps",
            "project plans",
            "strategic plans",
            "implementation plans"
        ]
    },


    // =========================================================
    // STATISTICS LAYOUTS
    // =========================================================

    {
        id: "statistics-highlight",

        slideTypes: ["statistics"],

        description:
            "A high-impact quantitative layout emphasizing a small number of important metrics through strong visual hierarchy.",

        composition: {
            arrangement: "grid",
            preferredMetrics: "2-4",
            valueEmphasis: "very-high"
        },

        bestFor: [
            "KPIs",
            "research statistics",
            "business metrics",
            "performance summaries"
        ]
    },


    // =========================================================
    // DATA CHART LAYOUTS
    // =========================================================

    {
        id: "chart-primary",

        slideTypes: ["data-chart"],

        description:
            "A data-focused composition giving the primary chart dominant visual space with a concise supporting insight.",

        composition: {
            chartPosition: "center",
            chartSize: "large",
            insightPosition: "bottom"
        },

        bestFor: [
            "research findings",
            "performance trends",
            "comparative quantitative data",
            "analytical reports"
        ]
    },


    {
        id: "chart-with-insight",

        slideTypes: ["data-chart"],

        description:
            "A split analytical layout pairing a substantial chart with a dedicated interpretation or takeaway area.",

        composition: {
            chartPosition: "left",
            insightPosition: "right",
            ratio: "65-35"
        },

        bestFor: [
            "executive briefings",
            "research interpretation",
            "business analytics"
        ]
    },


    // =========================================================
    // TABLE LAYOUT
    // =========================================================

    {
        id: "table-focus",

        slideTypes: ["table"],

        description:
            "A clean information-dense layout prioritizing precise tabular comparison while maintaining presentation readability.",

        composition: {
            tablePosition: "center",
            tableSize: "large",
            supportingText: "minimal"
        },

        bestFor: [
            "comparative datasets",
            "specifications",
            "structured results",
            "evaluation matrices"
        ]
    },


    // =========================================================
    // RELATIONSHIP LAYOUT
    // =========================================================

    {
        id: "relationship-network",

        slideTypes: ["relationship"],

        description:
            "A diagram-oriented layout showing relationships, dependencies, interactions, or conceptual connections between multiple entities.",

        composition: {
            arrangement: "network",
            connectorStyle: "relationship",
            visualEmphasis: "high"
        },

        bestFor: [
            "conceptual frameworks",
            "system relationships",
            "organizational structures",
            "research variables"
        ]
    },


    // =========================================================
    // QUOTE LAYOUT
    // =========================================================

    {
        id: "quote-emphasis",

        slideTypes: ["quote"],

        description:
            "A restrained high-emphasis layout designed to give a verified quotation or central statement maximum attention.",

        composition: {
            quotePosition: "center",
            attributionPosition: "below",
            visualEmphasis: "minimal"
        },

        bestFor: [
            "verified quotations",
            "testimonials",
            "important principles"
        ]
    },


    // =========================================================
    // CASE STUDY LAYOUT
    // =========================================================

    {
        id: "case-study-flow",

        slideTypes: ["case-study"],

        description:
            "A narrative layout organizing a case through context, challenge, action, outcome, and lesson.",

        composition: {
            arrangement: "structured-flow",

            sequence: [
                "context",
                "challenge",
                "action",
                "outcome",
                "lesson"
            ]
        },

        bestFor: [
            "business cases",
            "clinical cases",
            "project examples",
            "real-world applications"
        ]
    },


    // =========================================================
    // CALL TO ACTION
    // =========================================================

    {
        id: "cta-focus",

        slideTypes: ["call-to-action"],

        description:
            "A decisive closing composition emphasizing the desired action and supporting message.",

        composition: {
            alignment: "center",
            actionEmphasis: "very-high",
            supportingContent: "minimal"
        },

        bestFor: [
            "sales presentations",
            "startup pitches",
            "campaign presentations",
            "proposal endings"
        ]
    }

];


// =========================================================
// HELPER
// =========================================================

export const getLayoutsForSlideType = (
    slideType
) => {

    return presentationLayouts.filter(
        (layout) =>
            layout.slideTypes.includes(
                slideType
            )
    );

};
