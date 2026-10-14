// =========================================================
// PRESENTATION SLIDE CONTENT SCHEMAS
// =========================================================
//
// This file defines the canonical CONTENT CONTRACT for
// every semantic presentation slide type.
//
// slideTypes.mjs:
//      defines WHAT a slide means.
//
// slideContentSchemas.mjs:
//      defines WHAT CONTENT that slide should contain.
//
// presentationLayouts.mjs:
//      defines HOW that content may be arranged.
//
// renderers:
//      draw that content.
//
// IMPORTANT:
//
// The AI output schema and presentation validator must
// remain synchronized with these structures.
//
// =========================================================


export const slideContentSchemas = [


    // =====================================================
    // 1. TITLE
    // =====================================================

    {
        id: "title-content",

        usedBy: [
            "title"
        ],

        description:
            "For the opening slide of a presentation.",

        structure: {

            titleContent: {

                title: "string",

                subtitle: "string",

                supportingText: "string"

            }

        }

    },


    // =====================================================
    // 2. SECTION DIVIDER
    // =====================================================

    {
        id: "section-divider-content",

        usedBy: [
            "section-divider"
        ],

        description:
            "For introducing a new major section or phase of the presentation.",

        structure: {

            sectionContent: {

                title: "string",

                subtitle: "string"

            }

        }

    },


    // =====================================================
    // 3. LIST CONTENT
    // =====================================================
    //
    // Used when several concise but related items need
    // to be communicated.
    //
    // =====================================================

    {
        id: "list-content",

        usedBy: [
            "agenda",
            "key-points",
            "recommendation",
            "next-steps"
        ],

        description:
            "For slides communicating a concise collection of related points, actions, recommendations, priorities, or agenda items.",

        structure: {

            items: [

                {
                    title: "string",

                    description: "string"
                }

            ]

        }

    },


    // =====================================================
    // 4. FOCUSED EXPLANATION
    // =====================================================

    {
        id: "focused-explanation-content",

        usedBy: [
            "focused-explanation"
        ],

        description:
            "For explaining one central concept, argument, finding, issue, or idea.",

        structure: {

            textContent: {

                heading: "string",

                body: "string"

            }

        }

    },


    // =====================================================
    // 5. TEXT + VISUAL
    // =====================================================

    {
        id: "visual-content",

        usedBy: [
            "text-visual"
        ],

        description:
            "For explanatory content supported by a meaningful visual.",

        structure: {

            visualContent: {

                text: "string",

                visual: {

                    type: "string",

                    description: "string",

                    searchQuery: "string"

                }

            }

        }

    },


    // =====================================================
    // 6. CARDS
    // =====================================================

    {
        id: "card-content",

        usedBy: [
            "cards"
        ],

        description:
            "For several distinct but equally important items presented independently.",

        structure: {

            cards: [

                {
                    title: "string",

                    description: "string"
                }

            ]

        }

    },


    // =====================================================
    // 7. COMPARISON
    // =====================================================

    {
        id: "comparison-content",

        usedBy: [
            "comparison"
        ],

        description:
            "For comparing two or more alternatives, groups, conditions, approaches, products, methods, or concepts.",

        structure: {

            comparison: {

                items: [

                    {
                        label: "string",

                        points: [
                            "string"
                        ]
                    }

                ]

            }

        }

    },


    // =====================================================
    // 8. RELATIONSHIP
    // =====================================================

    {
        id: "relationship-content",

        usedBy: [
            "relationship"
        ],

        description:
            "For showing meaningful relationships between concepts, entities, variables, systems, or components.",

        structure: {

            relationship: {

                nodes: [

                    {
                        id: "string",

                        label: "string",

                        description: "string"
                    }

                ],

                relationships: [

                    {
                        from: "string",

                        to: "string",

                        label: "string"
                    }

                ]

            }

        }

    },


    // =====================================================
    // 9. PROCESS
    // =====================================================

    {
        id: "process-content",

        usedBy: [
            "process"
        ],

        description:
            "For communicating an ordered sequence of actions, stages, procedures, or operations.",

        structure: {

            process: {

                steps: [

                    {
                        stepNumber: "integer",

                        title: "string",

                        description: "string"
                    }

                ]

            }

        }

    },


    // =====================================================
    // 10. TIMELINE
    // =====================================================

    {
        id: "timeline-content",

        usedBy: [
            "timeline"
        ],

        description:
            "For chronological events, developments, milestones, or phases.",

        structure: {

            timeline: {

                events: [

                    {
                        label: "string",

                        title: "string",

                        description: "string"
                    }

                ]

            }

        }

    },


    // =====================================================
    // 11. ROADMAP
    // =====================================================
    //
    // Roadmaps and timelines may look similar visually,
    // but they communicate different things.
    //
    // Timeline = chronology.
    // Roadmap  = planned future progression.
    //
    // =====================================================

    {
        id: "roadmap-content",

        usedBy: [
            "roadmap"
        ],

        description:
            "For planned progression through phases, priorities, milestones, or strategic initiatives.",

        structure: {

            roadmap: {

                phases: [

                    {
                        label: "string",

                        title: "string",

                        description: "string"
                    }

                ]

            }

        }

    },


    // =====================================================
    // 12. STATISTICS
    // =====================================================

    {
        id: "statistics-content",

        usedBy: [
            "statistics"
        ],

        description:
            "For emphasizing a small number of important quantitative values or indicators.",

        structure: {

            statistics: [

                {
                    value: "string",

                    label: "string",

                    context: "string"
                }

            ]

        }

    },


    // =====================================================
    // 13. DATA CHART
    // =====================================================

    {
        id: "chart-content",

        usedBy: [
            "data-chart"
        ],

        description:
            "For quantitative information that should be represented through a chart or graph.",

        structure: {

            chart: {

                chartType: "string",

                labels: [
                    "string"
                ],

                datasets: [

                    {
                        label: "string",

                        values: [
                            "number"
                        ]
                    }

                ],

                insight: "string"

            }

        }

    },


    // =====================================================
    // 14. TABLE
    // =====================================================

    {
        id: "table-content",

        usedBy: [
            "table"
        ],

        description:
            "For structured information requiring precise row-and-column comparison.",

        structure: {

            table: {

                columns: [
                    "string"
                ],

                rows: [

                    {
                        cells: [
                            "string"
                        ]
                    }

                ]

            }

        }

    },


    // =====================================================
    // 15. QUOTE
    // =====================================================

    {
        id: "quote-content",

        usedBy: [
            "quote"
        ],

        description:
            "For an important verified quotation, testimonial, principle, or emphasized statement.",

        structure: {

            quote: {

                text: "string",

                attribution: "string",

                context: "string"

            }

        }

    },


    // =====================================================
    // 16. CASE STUDY
    // =====================================================

    {
        id: "case-study-content",

        usedBy: [
            "case-study"
        ],

        description:
            "For a concrete example, scenario, project, application, or real-world case.",

        structure: {

            caseStudy: {

                context: "string",

                challenge: "string",

                action: "string",

                outcome: "string",

                lesson: "string"

            }

        }

    },


    // =====================================================
    // 17. CALL TO ACTION
    // =====================================================
    //
    // CTA is deliberately separate from ordinary list
    // content because its communication purpose is
    // different.
    //
    // =====================================================

    {
        id: "call-to-action-content",

        usedBy: [
            "call-to-action"
        ],

        description:
            "For communicating one clear action or decision the audience should take.",

        structure: {

            callToAction: {

                action: "string",

                supportingText: "string"

            }

        }

    },


    // =====================================================
    // 18. SUMMARY
    // =====================================================

    {
        id: "summary-content",

        usedBy: [
            "summary"
        ],

        description:
            "For synthesizing the most important messages or takeaways from the presentation.",

        structure: {

            summary: {

                statement: "string",

                points: [
                    "string"
                ]

            }

        }

    },


    // =====================================================
    // 19. CONCLUSION
    // =====================================================

    {
        id: "conclusion-content",

        usedBy: [
            "conclusion"
        ],

        description:
            "For communicating the final conclusion, implication, position, or overall message.",

        structure: {

            conclusion: {

                statement: "string",

                supportingPoints: [
                    "string"
                ]

            }

        }

    }

];


// =========================================================
// GET CONTENT SCHEMA FOR SLIDE TYPE
// =========================================================

export const SLIDE_TYPE_CONTENT_MAP = Object.freeze(Object.fromEntries(
    slideContentSchemas.flatMap(schema => schema.usedBy.map(type => [type, Object.keys(schema.structure)[0]]))
));

// Readable widescreen capacities, shared by Gemini schemas and the renderer.
export const PRESENTATION_COLLECTION_LIMITS = Object.freeze({
    items: 6, cards: 6, 'comparison.items': 3, 'comparison.items.points': 4,
    'relationship.nodes': 5, 'relationship.relationships': 5, 'process.steps': 6,
    'timeline.events': 6, 'roadmap.phases': 6, statistics: 4,
    'chart.labels': 8, 'chart.datasets': 3, 'chart.datasets.values': 8,
    'table.columns': 4, 'table.rows': 6, 'table.rows.cells': 4,
    'summary.points': 5, 'conclusion.supportingPoints': 4
});

export const getContentSchemaForSlideType = (
    slideType
) => {

    return slideContentSchemas.find(
        (schema) =>
            schema.usedBy.includes(
                slideType
            )
    );

};


// =========================================================
// GET CONTENT SCHEMA BY ID
// =========================================================

export const getContentSchemaById = (
    schemaId
) => {

    return slideContentSchemas.find(
        (schema) =>
            schema.id === schemaId
    );

};


// =========================================================
// CHECK WHETHER SLIDE TYPE HAS A CONTENT SCHEMA
// =========================================================

export const hasContentSchemaForSlideType = (
    slideType
) => {

    return Boolean(
        getContentSchemaForSlideType(
            slideType
        )
    );

};


// =========================================================
// GET ALL SUPPORTED SLIDE TYPES
// =========================================================

export const getContentSchemaSlideTypes = () => {

    return [
        ...new Set(
            slideContentSchemas.flatMap(
                (schema) =>
                    schema.usedBy
            )
        )
    ];

};
