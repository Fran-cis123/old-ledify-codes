import { Type } from "@google/genai";

// INFERRED CONTEXT SCHEMA

export const inferredContextSchema = {

    type: Type.OBJECT,

    properties: {

        userRole: {
            type: Type.STRING,
            description:
                "The user's role when it is explicitly stated or reasonably clear from the request. Use an empty string when unknown."
        },

        purpose: {
            type: Type.STRING,
            description:
                "The primary communication objective of the requested output. Use an empty string when it cannot be determined."
        },

        audience: {
            type: Type.STRING,
            description:
                "The intended audience when explicitly stated or reasonably clear. Use an empty string when unknown."
        },

        topic: {
            type: Type.STRING,
            description:
                "The main subject or topic of the user's request."
        },

        tone: {
            type: Type.STRING,
            description:
                "The communication tone appropriate to the request, such as formal, academic, executive, persuasive, educational or conversational."
        },

        keyInstructions: {

            type: Type.ARRAY,

            description:
                "Important explicit instructions or constraints supplied by the user.",

            items: {
                type: Type.STRING
            }

        }

    },

    required: [
        "userRole",
        "purpose",
        "audience",
        "topic",
        "tone",
        "keyInstructions"
    ]

};