import { generateWebpageContent } from './ai/webpageGeneration.mjs';
import { generateDocumentContent } from './document/documentGeneration.mjs';
import { validateDocumentAssets } from '../renderer/document/docxRenderer.mjs';
import { canonicalTitles, reviewAndRepairPresentation, requestedTopics } from './ai/presentationQuality.mjs';
import { visualRequirementSchema, diagramSchema } from '../templates/presentation/visualSchemas.mjs';
import { resolveSlideCount } from './ai/slideCount.mjs';
import { numberedSlideRequirements, validateNumberedRequirements } from './ai/presentationIntent.mjs';
import { randomUUID } from 'node:crypto';
import {performanceRequestId} from './performance.mjs';
import { generateJsonWithRetry } from './ai/generateJsonWithRetry.mjs';
import { generationConcurrency, generateContentUnits as generateInBatches } from './ai/concurrency.mjs';
import { buildOutlinePrompt, buildSlidePrompt, validateOutline, outlineProviderSchema } from './ai/presentationPrompts.mjs';
import { SLIDE_TYPE_CONTENT_MAP, PRESENTATION_COLLECTION_LIMITS } from '../templates/presentation/slideContentSchemas.mjs';
import { validateSlideContent } from './presentationContentValidator.mjs';
import { imageSlideSchema, contentBudgetPrompt } from './ai/presentationContentBudget.mjs';
import { AiGenerationError } from './ai/responseValidation.mjs';
import { validateQuantitativeGrounding } from './ai/sourceGrounding.mjs';
import { repairPresentationValidation } from './ai/presentationValidation.mjs';
import {wantsTextOnly,planImageCoverage} from './visual/imageArtDirection.mjs';
import {presentationLayoutService} from './presentationLayoutService.mjs';
import {
    GoogleGenAI,
    Type
} from "@google/genai";

import {
    presentationStrategies
} from "../templates/presentation/presentationStrategies.mjs";

import {
    slideTypes
} from "../templates/presentation/slideTypes.mjs";

import {
    inferredContextSchema
} from "../templates/shared/contextSchema.mjs";

import {
    validatePresentationContent
} from "./presentationContentValidator.mjs";


// =========================================================
// GEMINI CLIENT
// =========================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// =========================================================
// AI SERVICE
// =========================================================

export const aiService = async (
    inputType,
    input,
    outputType,
    context = {},
    options = {}
) => {
    if (!["prompt", "file", "url"].includes(inputType) || !["presentation", "document", "webpage"].includes(outputType)) {
        throw new Error("Unsupported input or output type");
    }
    if (typeof input !== "string" || !input.trim()) throw new Error("Nonempty source input is required");
    if (!context || typeof context !== "object" || Array.isArray(context)) throw new Error("Context must be an object");

    if (outputType === 'webpage') {
        const generatedContent = await generateWebpageContent({ client: options.client || ai, inputType, input, context, options });
        return { inputType, input, outputType, context, generatedContent };
    }
    if (outputType === 'document') {
        const assets=await validateDocumentAssets(options.assets||context.documentImages||[]);
        const generatedContent=await generateDocumentContent({client:options.client||ai,inputType,input,context,options:{...options,assets}});
        return {inputType,input,outputType,context,generatedContent};
    }
    const countPolicy = outputType === "presentation" ? resolveSlideCount(inputType === 'prompt' ? input : '', context) : null;
    if(countPolicy)for(const requirement of numberedSlideRequirements(inputType==='prompt'?input:'',context)){
        if(requirement.slideNumber<1||requirement.slideNumber>countPolicy.max)throw Object.assign(new Error(`The instruction for slide ${requirement.slideNumber} exceeds the requested ${countPolicy.max}-slide limit.`),{code:'INVALID_SLIDE_REQUIREMENT',slideNumber:requirement.slideNumber,field:'slideCount'});
    }
    let outputInstructions = "";
    let outputSchema;
    let strategyInstructions = "";
    let presentationPlanSchema;


    // =====================================================
    // PRESENTATION
    // =====================================================

        if (outputType === "presentation") {

        const strategyIds =
            presentationStrategies.map(
                (strategy) => strategy.id
            );


        const slideTypeIds =
            slideTypes.map(
                (slideType) => slideType.id
            );


        presentationPlanSchema = {
            type: Type.OBJECT,

            properties: {
                outputType: {
                    type: Type.STRING,
                    enum: ["presentation"]
                },

                inferredContext:
                    inferredContextSchema,

                strategyId: {
                    type: Type.STRING,
                    enum: strategyIds
                },

                title: {
                    type: Type.STRING
                },

                subtitle: {
                    type: Type.STRING
                },

                slides: {
                    type: Type.ARRAY,
                    maxItems: 12,

                    items: {
                        type: Type.OBJECT,

                        properties: {
                            slideNumber: {
                                type: Type.INTEGER
                            },

                            slideType: {
                                type: Type.STRING,
                                enum: slideTypeIds
                            },

                            title: {
                                type: Type.STRING
                            },

                            subtitle: {
                                type: Type.STRING
                            }
                        },

                        required: [
                            "slideNumber",
                            "slideType",
                            "title"
                        ]
                    }
                }
            },

            required: [
                "outputType",
                "inferredContext",
                "strategyId",
                "title",
                "slides"
            ]
        };



        // Detailed slide schemas are retained; outline instructions live in ai/presentationPrompts.mjs.
        outputSchema = {

            type: Type.OBJECT,

            properties: {

                outputType: {
                    type: Type.STRING,
                    enum: ["presentation"]
                },

                inferredContext:
                    inferredContextSchema,

                strategyId: {
                    type: Type.STRING,
                    enum: strategyIds
                },

                title: {
                    type: Type.STRING
                },

                subtitle: {
                    type: Type.STRING
                },

                slides: {

                    type: Type.ARRAY,

                    maxItems: 12,

                    items: {

                        type: Type.OBJECT,

                        properties: {

                            slideNumber: {
                                type: Type.INTEGER
                            },

                            slideType: {
                                type: Type.STRING,
                                enum: slideTypeIds
                            },
                                                        title: {
                                type: Type.STRING
                            },

                            subtitle: {
                                type: Type.STRING
                            },

                            content: {

                                type: Type.OBJECT,

                                properties: {


                                    // =============================
                                    // TITLE
                                    // =============================

                                    titleContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            title: {
                                                type: Type.STRING
                                            },

                                            subtitle: {
                                                type: Type.STRING
                                            },

                                            supportingText: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // SECTION DIVIDER
                                    // =============================

                                    sectionContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            title: {
                                                type: Type.STRING
                                            },

                                            subtitle: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // LIST ITEMS
                                    //
                                    // agenda
                                    // key-points
                                    // recommendation
                                    // next-steps
                                    // =============================

                                  items: {

                                    type: Type.ARRAY,

                                    maxItems: 6,

                                    items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                title: {
                                                    type: Type.STRING
                                                },

                                                description: {
                                                    type: Type.STRING
                                                }

                                            },

                                            required: [
                                                "title",
                                                "description"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // FOCUSED EXPLANATION
                                    // =============================

                                    textContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            heading: {
                                                type: Type.STRING
                                            },

                                            body: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // TEXT + VISUAL
                                    // =============================

                                    visualContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            text: {
                                                type: Type.STRING
                                            },

                                            visual: {

                                                type: Type.OBJECT,

                                                properties: {

                                                    type: {
                                                        type: Type.STRING
                                                    },

                                                    description: {
                                                        type: Type.STRING
                                                    },

                                                    searchQuery: {
                                                        type: Type.STRING
                                                    }

                                                },

                                                required: [
                                                    "type",
                                                    "description",
                                                    "searchQuery"
                                                ]

                                            }

                                        },

                                        required: [
                                            "text",
                                            "visual"
                                        ]

                                    },


                                    // =============================
                                    // CARDS
                                    // =============================

                                    cards: {

                                        type: Type.ARRAY,

                                            maxItems: 6,

                                                items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                title: {
                                                    type: Type.STRING
                                                },

                                                description: {
                                                    type: Type.STRING
                                                }

                                            },

                                            required: [
                                                "title",
                                                "description"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // COMPARISON
                                    // =============================

                                    comparison: {

                                        type: Type.OBJECT,

                                        properties: {

                                            items: {

                                                type: Type.ARRAY,

                                            maxItems: 4,

                                                items: {
                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        points: {

                                                        type: Type.ARRAY,

                                                        maxItems: 5,

                                                        items: {

                                                        type: Type.STRING
    }

}

                                                    },

                                                    required: [
                                                        "label",
                                                        "points"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // RELATIONSHIP
                                    // =============================

                                    relationship: {

                                        type: Type.OBJECT,

                                        properties: {

                                            nodes: {

                                                type: Type.ARRAY,

                                                maxItems: 7,

                                                items: {
                                                    type: Type.OBJECT,

                                                    properties: {

                                                        id: {
                                                            type: Type.STRING
                                                        },

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "id",
                                                        "label",
                                                        "description"
                                                    ]

                                                }

                                            },

                                            relationships: {

                                                type: Type.ARRAY,

                                                maxItems: 10,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        from: {
                                                            type: Type.STRING
                                                        },

                                                        to: {
                                                            type: Type.STRING
                                                        },

                                                        label: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "from",
                                                        "to",
                                                        "label"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // PROCESS
                                    // =============================

                                                                        process: {

                                        type: Type.OBJECT,

                                        properties: {

                                            steps: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        stepNumber: {
                                                            type: Type.INTEGER
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "stepNumber",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // TIMELINE
                                    // =============================

                                    timeline: {

                                        type: Type.OBJECT,

                                        properties: {

                                            events: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // ROADMAP
                                    // =============================

                                    roadmap: {

                                        type: Type.OBJECT,

                                        properties: {

                                            phases: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // STATISTICS
                                    // =============================

                                    statistics: {

                                     type: Type.ARRAY,

                                     maxItems: 5,

                                     items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                value: {
                                                    type: Type.STRING
                                                },

                                                label: {
                                                    type: Type.STRING
                                                },

                                                context: {
                                                    type: Type.STRING
                                                }

                                            },
                                                                                        required: [
                                                "value",
                                                "label",
                                                "context"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // DATA CHART
                                    // =============================

                                    chart: {

                                        type: Type.OBJECT,

                                        properties: {

                                            chartType: {
                                                type: Type.STRING
                                            },

                                            labels: {

                                                type: Type.ARRAY,

                                                maxItems: 12,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            },

                                            datasets: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        values: {

                                                            type: Type.ARRAY,

                                                            maxItems: 12,

                                                            items: {
                                                                type: Type.NUMBER
                                                            }

                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "values"
                                                    ]

                                                }

                                            },

                                            insight: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // TABLE
                                    // =============================

                                        table: {

                                            type: Type.OBJECT,

                                            properties: {

                                                columns: {

                                                    type: Type.ARRAY,

                                                    maxItems: 6,

                                                    items: {
                                                        type: Type.STRING
                                                    }

                                                },

                                                rows: {

                                                    type: Type.ARRAY,

                                                    maxItems: 8,

                                                    items: {

                                                        type: Type.OBJECT,

                                                        properties: {

                                                            cells: {

                                                                type: Type.ARRAY,

                                                                maxItems: 6,

                                                                items: {
                                                                    type: Type.STRING
                                                                }

                                                            }

                                                        },

                                                        required: [
                                                            "cells"
                                                        ]

                                                    }

                                                }

                                            }

                                        },

                                    // =============================
                                    // QUOTE
                                    // =============================

                                    quote: {

                                        type: Type.OBJECT,

                                        properties: {

                                            text: {
                                                type: Type.STRING
                                            },

                                            attribution: {
                                                type: Type.STRING
                                            },

                                            context: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // CASE STUDY
                                    // =============================

                                    caseStudy: {

                                        type: Type.OBJECT,
                                                                                properties: {

                                            context: {
                                                type: Type.STRING
                                            },

                                            challenge: {
                                                type: Type.STRING
                                            },

                                            action: {
                                                type: Type.STRING
                                            },

                                            outcome: {
                                                type: Type.STRING
                                            },

                                            lesson: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // CALL TO ACTION
                                    // =============================

                                    callToAction: {

                                        type: Type.OBJECT,

                                        properties: {

                                            action: {
                                                type: Type.STRING
                                            },

                                            supportingText: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // SUMMARY
                                    // =============================

                                    summary: {

                                        type: Type.OBJECT,

                                        properties: {

                                            statement: {
                                                type: Type.STRING
                                            },

                                            points: {

                                                type: Type.ARRAY,

                                                maxItems: 5,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // CONCLUSION
                                    // =============================

                                    conclusion: {

                                        type: Type.OBJECT,

                                        properties: {

                                            statement: {
                                                type: Type.STRING
                                            },

                                           supportingPoints: {

                                                type: Type.ARRAY,

                                                maxItems: 4,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            }

                                        }

                                    }

                                }

                            },

                        },

                        required: [
                            "slideNumber",
                            "slideType",
                            "title",
                            "content"
                        ]

                    }

                }

            },

            required: [
                "outputType",
                "inferredContext",
                "strategyId",
                "title",
                "slides"
            ]

        };

    // =====================================================
    // DOCUMENT
    // =====================================================

    } else {

        throw new Error(
            "Invalid output type"
        );

    }


    // =====================================================
    // MAIN PROMPT
    // =====================================================

    const prompt = `
You are a professional structured-content generation engine.

Transform the user's request into high-quality structured content.


=========================================================
USER REQUEST
=========================================================

INPUT TYPE:
${inputType}

INPUT:
${input}

OUTPUT TYPE:
${outputType}

USER ROLE:
${context?.userRole || "Not specified"}

PURPOSE:
${context?.purpose || "Not specified"}

AUDIENCE:
${context?.audience || "Not specified"}


=========================================================
CONTEXT UNDERSTANDING
=========================================================

Analyze the complete user request and return an
"inferredContext" object as part of the structured response.

The purpose of inferredContext is to let the application
understand the user's communication situation without requiring

the user to complete separate role, purpose, or audience fields.

Infer only what is supported by the request or supplied source
material:

- userRole
- purpose
- audience
- topic
- tone
- keyInstructions


IMPORTANT:

Do not invent personal or situational information merely to
fill fields.

If the user's role is unknown, return:

"userRole": ""

If the intended audience is unknown, return:

"audience": ""

If the purpose cannot reasonably be determined, return:

"purpose": ""

The topic should identify the central subject of the request.

The inferred topic is especially important because it becomes
the semantic anchor for the generated output.

Do not replace the user's topic with an example topic or an
unrelated subject.

The tone should describe the communication style that best
fits the request.

Examples include:

- formal
- academic
- scientific
- executive
- persuasive
- educational
- technical
- conversational

keyInstructions must preserve important explicit instructions
and constraints supplied by the user.


=========================================================
EXPLICIT CONTEXT PRIORITY
=========================================================

Explicit information supplied by the user has priority over
inference.

If USER ROLE, PURPOSE, or AUDIENCE is supplied separately above,
treat that information as authoritative unless the user's
current instruction clearly updates or contradicts it.

Do NOT invent context simply because it would make
classification easier.

Do NOT assume:

- every presentation is academic
- every user is a student
- every document is formal
- every webpage is commercial
- every research-related request is a research defense
- an audience that has not been established

When information is unknown, preserve that uncertainty instead
of manufacturing context.


=========================================================
IMPORTANT EXAMPLE ISOLATION RULE
=========================================================

Examples contained in this prompt exist ONLY to demonstrate
expected reasoning or structure.

Never treat example subjects, industries, people, research
topics, technologies or terminology as part of the user's
request.

Never copy subject matter from an example into generated
content unless the user's actual request independently requires
that subject.


=========================================================
OUTPUT-SPECIFIC INTELLIGENCE
=========================================================

${strategyInstructions}


=========================================================
GENERAL CONTENT REQUIREMENTS
=========================================================

Consider the complete request:

- user input
- supplied source material
- inferred context
- explicitly supplied context
- user role when known
- purpose when known
- audience when known
- topic
- explicit instructions
- requested output type

Use these factors to determine:

- priorities
- depth
- terminology
- organization
- emphasis
- explanation
- professional style


=========================================================
GLOBAL TOPIC CONSISTENCY
=========================================================

The generated output must remain relevant to the user's central
subject from beginning to end.

Do not allow examples, schema descriptions, strategy catalogs
or general model knowledge to redirect the output into another
topic.

Every major section or slide must have a defensible relationship
to the user's request.

If information is not relevant to the user's central topic or
communication objective, omit it.


=========================================================
FACTUAL INTEGRITY
=========================================================

Never manufacture factual evidence to make the output appear
complete.

Reliable general knowledge may be used when it is relevant to
the user's request.

Creative or proposed content may be generated when the task
calls for it.

However, never present invented user-specific information as
verified fact.

Do not invent unsupported:

- statistics
- measurements
- research findings
- experimental results
- financial figures
- dates
- citations
- quotations
- references
- performance metrics
=========================================================
OUTPUT REQUIREMENTS
=========================================================

${outputInstructions}

Return only valid JSON that matches the response schema.
`;

// Shared response validation and bounded retries for each independent stage.
const client = options.client || ai;
const requestId = performanceRequestId()||randomUUID();
const run = (args) => generateJsonWithRetry({ client, requestId, logger: options.logger, sleep: options.sleep, ...args });
const isPresentation = outputType === 'presentation';
const schema = isPresentation ? presentationPlanSchema : outputSchema;
if (isPresentation) {
    schema.properties.slides.minItems = countPolicy.min;
    schema.properties.slides.maxItems = countPolicy.max;
    schema.properties.slides.items.properties.objective = { type: 'string' };
    schema.properties.slides.items.properties.visualRequirement = visualRequirementSchema;
    schema.properties.requirements = { type: 'array', maxItems: Math.max(1,requestedTopics(inputType === 'prompt' ? input : '', context).length || 8), items: { type: 'object', properties: {
        topic: { type: 'string' }, slideNumbers: { type: 'array', items: { type: 'integer' }, maxItems: 2 },
        essentialPoints: { type: 'array', items: { type: 'string' }, maxItems: 3 }
    }, required: ['topic', 'slideNumbers', 'essentialPoints'], additionalProperties: false } };
    const explicitTopics=requestedTopics(inputType === 'prompt' ? input : '',context);
    if(explicitTopics.length){
        schema.required.push('requirements');
    }
}
let plannedSlides;
let generatedContent = isPresentation && options.initialPresentation ? structuredClone(options.initialPresentation) : await run({
    stage: isPresentation ? 'presentation-outline' : 'content-generation',
    schema, outputType, strict: isPresentation,
    validate: isPresentation ? value => {validateOutline(value, countPolicy, requestedTopics(inputType === 'prompt' ? input : '', context));validateNumberedRequirements(value,numberedSlideRequirements(inputType === 'prompt' ? input : '',context));} : value => {
        if (value.outputType !== outputType) throw new Error('AI returned incorrect outputType');
    },
    request: {
        model: process.env.GEMINI_OUTLINE_MODEL || 'gemini-3.7-flash',
        contents: isPresentation ? buildOutlinePrompt(inputType, input, context, countPolicy) : prompt,
        config: {
            responseMimeType: 'application/json', responseJsonSchema: isPresentation ? outlineProviderSchema(schema) : schema,
            maxOutputTokens: 8192,
            ...(isPresentation ? { thinkingConfig: { thinkingBudget: 1024 }, temperature: 0.3 } : {})
        }
    }
});
if (isPresentation) {
    plannedSlides=generatedContent.slides.map(({slideNumber,title,objective})=>({slideNumber,title,objective}));
    const plannedPictures=planImageCoverage(generatedContent,{...context,instructions:[context.instructions,inputType==='prompt'?input:''].filter(Boolean).join('\n')});
    for(const slide of generatedContent.slides){
        const planned=plannedPictures.slides.find(s=>s.slideNumber===slide.slideNumber);
        slide.imageLayoutPlanned=!!planned?.imageRequirement;
        slide.visualRequirement=planned.visualRequirement;
    }
    canonicalTitles(generatedContent);
    const contentProperties = outputSchema.properties.slides.items.properties.content.properties;
    contentProperties.visualContent.properties.visual.properties.diagram = diagramSchema;
    for (const [path, limit] of Object.entries(PRESENTATION_COLLECTION_LIMITS)) {
        let node = { properties: contentProperties };
        for (const key of path.split('.')) {
            if (node.type?.toLowerCase() === 'array') node = node.items;
            node = node.properties[key];
        }
        node.maxItems = limit;
    }
    contentProperties.chart.properties.chartType.enum = ['bar', 'column', 'line', 'pie', 'doughnut', 'area'];
    const previous = [];
    await options.onSlideCheckpoint?.(generatedContent);
    const generateSlide = async (slide, repairInstruction = '') => {
        const contentKey = SLIDE_TYPE_CONTENT_MAP[slide.slideType];
        const imageContext={...context,instructions:[context.instructions,inputType==='prompt'?input:''].filter(Boolean).join('\n')};
        const usesImage=slide.imageLayoutPlanned??!!planImageCoverage({slides:[slide]},imageContext).slides[0].imageRequirement;
        const baseSlideSchema = {
            type: Type.OBJECT,
            properties: { [contentKey]: contentProperties[contentKey] },
            required: [contentKey], additionalProperties: false
        };
        const slideSchema=usesImage?imageSlideSchema(baseSlideSchema):baseSlideSchema;
        const content=await run({
            stage: 'slide-content-generation', slideNumber: slide.slideNumber,
            schema: slideSchema, outputType,
            validate: content => {
                if (slide.slideType === 'title') content.titleContent = { ...content.titleContent, title: generatedContent.title, subtitle: generatedContent.subtitle || '' };
                const completedSlide = { ...slide, content };
                validateSlideContent(completedSlide);
                // Use the same candidate selection as the final renderer;
                // generic grid validation can approve prose that later fails
                // in a horizontal process or comparison composition.
                presentationLayoutService({title:generatedContent.title,subtitle:generatedContent.subtitle,slides:[completedSlide]},context);
                validateQuantitativeGrounding(completedSlide, input);
            },
            request: {
                model: process.env.GEMINI_SLIDE_MODEL || 'gemini-3.5-flash',
                contents: buildSlidePrompt(input, context, generatedContent, slide, previous,usesImage) + contentBudgetPrompt(slideSchema) + (repairInstruction ? `\nTargeted quality repair; preserve all correct content and the same canonical structure:\n${repairInstruction}` : ''),
                config: { responseMimeType: 'application/json', responseJsonSchema: slideSchema,
                    maxOutputTokens: 4096,
                    thinkingConfig:{thinkingBudget:Math.max(128,Math.min(8192,Number(process.env.GEMINI_SLIDE_THINKING_BUDGET)||1024))} }
            }
        });
        await options.onSlideReady?.({...slide,content},generatedContent);
        return content;
    };
    await generateInBatches(generatedContent.slides,
        generationConcurrency(options.slideConcurrency??process.env.LEDIFY_SLIDE_CONCURRENCY),
        slide=>options.initialPresentation&&slide.content?slide.content:generateSlide(slide),
        async (content,slide)=>{
            slide.content=content;
            previous.push({title:slide.title,content:JSON.stringify(content).slice(0,350)});
            await options.onSlideCheckpoint?.(generatedContent);
        });
    canonicalTitles(generatedContent);
    const repairApprovedSlide=async(slide,instructions)=>{
        let repaired={...slide};
        if(/\b(?:title|subtitle|heading)\b/i.test(instructions.split('Resolve these exact validation failures')[0])){
            const metadataSchema={type:'object',properties:{title:{type:'string'},subtitle:{type:'string'}},required:['title','subtitle'],additionalProperties:false};
            const metadata=await run({stage:'slide-metadata-repair',slideNumber:slide.slideNumber,schema:metadataSchema,outputType:'presentation',
                request:{model:process.env.GEMINI_SLIDE_MODEL || 'gemini-3.5-flash',contents:`Correct only this slide title/subtitle for factual accuracy and readability. Title under 80 characters, subtitle under 90; no generic filler or unsupported absolute claims. Preserve topic. Instructions: ${instructions}\nCurrent slide: ${JSON.stringify(slide)}\nSource/context: ${JSON.stringify({input,context})}`,config:{responseMimeType:'application/json',responseJsonSchema:metadataSchema,maxOutputTokens:1024}},
                validate:value=>{if(!value.title.trim()||value.title.length>80||value.subtitle.length>90)throw new Error('Slide metadata must fit concise readable fields');}});
            repaired={...slide,...metadata};
            if(slide.slideType==='title'){generatedContent.title=metadata.title;generatedContent.subtitle=metadata.subtitle;}
        }
        repaired.content=await generateSlide(repaired,instructions);
        return repaired;
    };
    await repairPresentationValidation({presentation:generatedContent,source:{inputType,input,context,plannedSlides},requestId,repairSlide:repairApprovedSlide});
    if (options.qualityReview !== false) generatedContent = await reviewAndRepairPresentation({ presentation: generatedContent,
        input, inputType, context, client, requestId, options, repairSlide: repairApprovedSlide });
    await repairPresentationValidation({presentation:generatedContent,source:{inputType,input,context,plannedSlides},requestId,repairSlide:repairApprovedSlide});
    const references = Array.isArray(context.references) ? context.references.filter(ref => typeof ref.title === 'string' && /^https:\/\//.test(ref.url || '')) : [];
    for (const slide of generatedContent.slides) slide.references = references.filter(ref => !ref.slideNumbers?.length || ref.slideNumbers.includes(slide.slideNumber)).map(({ title, url }) => ({ title, url }));
    if (context.includeSpeakerNotes === true) {
        const notesSchema = { type: 'object', properties: { slides: { type: 'array', minItems: generatedContent.slides.length, maxItems: generatedContent.slides.length,
            items: { type: 'object', properties: { slideNumber: { type: 'integer' }, notes: { type: 'string' } }, required: ['slideNumber', 'notes'], additionalProperties: false } } }, required: ['slides'], additionalProperties: false };
        const notes = await run({ stage: 'speaker-notes-generation', schema: notesSchema, outputType: 'presentation', strict: true,
            validate: value => { if(value.slides.some((s,i)=>s.slideNumber!==i+1 || !s.notes.trim())) throw new Error('Notes must match every slide in order'); },
            request: { model: process.env.GEMINI_SLIDE_MODEL || 'gemini-3.5-flash', contents: `Write optional speaker notes, one short paragraph per slide, from this approved deck and source. Preserve facts and uncertainty, add no invented claims or citations. Notes are not visible slide text. Source: ${JSON.stringify(input)}\nDeck: ${JSON.stringify(generatedContent)}`,config:{responseMimeType:'application/json',responseJsonSchema:notesSchema,maxOutputTokens:8192} } });
        for(const note of notes.slides) generatedContent.slides[note.slideNumber-1].speakerNotes=note.notes;
    }
    await options.onCheckpoint?.(generatedContent);
}

// =====================================================
// PRESENTATION CONTENT VALIDATION
// =====================================================
//
// Local response-schema validation has checked the JSON shape.
//
// presentationContentValidator provides the second
// protection layer.
//
// It protects the application from content that is
// structurally valid JSON but still unsuitable for an
// actual presentation.
//
// Nothing reaches the presentation layout/theme/render
// pipeline until this validation succeeds.
//
// =====================================================

if (
    outputType ===
    "presentation"
) {

    try { validatePresentationContent(
        {outputType:generatedContent.outputType,title:generatedContent.title,subtitle:generatedContent.subtitle,strategyId:generatedContent.strategyId,inferredContext:generatedContent.inferredContext,
            slides:generatedContent.slides.map(({slideNumber,slideType,title,subtitle,content})=>({slideNumber,slideType,title,subtitle,content}))},
        {
            inputType,
            input,
            context,
            plannedSlides
        }
    ); } catch (error) {
        throw new AiGenerationError("AI_SCHEMA_VALIDATION_FAILED", error.message,
            { requestId, stage: "presentation-validation",validationRule:error.validationRule||'PRESENTATION_CONTENT' });
    }

}


// =====================================================
// RETURN
// =====================================================

return {

    inputType,

    input,

    outputType,

    context,

    generatedContent

};

};
