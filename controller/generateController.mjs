import generateModel from "../model/generateModel.mjs"
import { fileService } from "../Service/fileService.mjs";
import { urlService } from "../Service/urlService.mjs";
import { generateService } from "../Service/generateService.mjs";

export const userText = async (req, res) => {

    let newRequest;

    try {

        const {
            textPrompt,
            outputType,
            context
        } = req.body;


        // 1. Validate request
        if (!textPrompt || !outputType) {
            return res.status(400).json({
                message: "Textprompt and outputType are required"
            });
        }


        // 2. Create the database record first
        newRequest = await generateModel.create({

            inputType: "prompt",

            input: textPrompt,

            outputType,

            status: "processing"

        });


        // 3. Send the request to the AI service
        const result = await generateService(
            "prompt",
            textPrompt,
            outputType,
            context
        );


        // 4. Save the generated content
        //    and mark the request as completed
        newRequest.status = "completed";

        newRequest.generatedContent = result.generatedContent;

        await newRequest.save();


        // 5. Return the completed request
        return res.status(201).json({

            message: "Service called Successfully",

            data: {
                request: newRequest,
                result: result
            }

        });

    } catch (error) {

        // 6. If a database record was created,
        //    mark that request as failed
        if (newRequest) {

            newRequest.status = "failed";

            await newRequest.save();

        }


        return res.status(500).json({

            message: "Try again later",

            error: error.message

        });

    }
};

export const userUrl = async (req, res) => {

    let newRequest;

    try {

        const {
            urlPrompt,
            outputType,
            context
        } = req.body;


        // 1. Validate request
        if (!urlPrompt || !outputType) {
            return res.status(400).json({
                message: "Url and outputType are required"
            });
        }


        // 2. Create database record
        newRequest = await generateModel.create({

            inputType: "url",

            input: urlPrompt,

            outputType,

            status: "processing"

        });


        // 3. Get content from the URL
        const urlContent = await urlService(urlPrompt);


        // 4. Send the extracted content to the AI
        const result = await generateService(
            "url",
            urlContent,
            outputType,
            context
        );


        // 5. Save generated content
        newRequest.status = "completed";

        newRequest.generatedContent = result.generatedContent;

        await newRequest.save();


        // 6. Return result
        return res.status(201).json({

            message: "Service called Successfully",

            data: {
                request: newRequest,
                result: result
            }

        });

    } catch (error) {

        // Mark request as failed
        if (newRequest) {

            newRequest.status = "failed";

            await newRequest.save();

        }

        return res.status(500).json({

            message: "Try again later",

            error: error.message

        });

    }
};


export const userFile = async (req, res) => {

    let newRequest;

    try {

        const {
            outputType,
            context
        } = req.body;


        // 1. Validate uploaded file
        if (!req.file) {
            return res.status(400).json({
                message: "File is required"
            });
        }


        // 2. Validate output type
        if (!outputType) {
            return res.status(400).json({
                message: "outputType is required"
            });
        }


        // 3. Parse context
        let parsedContext = {};

        if (context) {
            parsedContext = JSON.parse(context);
        }


        // 4. Get uploaded file
        const file = req.file;


        // 5. Extract text from the document
        const fileContent = await fileService(file);


        // 6. Create database record
        newRequest = await generateModel.create({

            inputType: "file",

            input: file.originalname,

            outputType,

            status: "processing"

        });


        // 7. Send extracted document content
        // to the generation service
        const result = await generateService(
            "file",
            fileContent,
            outputType,
            parsedContext
        );


        // 8. Save generated content
        newRequest.generatedContent = result.generatedContent;

        newRequest.status = "completed";

        await newRequest.save();


        // 9. Return result
        return res.status(201).json({

            message: "File processed successfully",

            data: {

                request: newRequest,

                result: result

            }

        });


    } catch (error) {


        // Mark database request as failed
        // if the record was already created
        if (newRequest) {

            newRequest.status = "failed";

            await newRequest.save();

        }


        console.error("FILE PROCESSING ERROR:", error);


        return res.status(500).json({

            message: "Try again later",

            error: error.message

        });

    }

};