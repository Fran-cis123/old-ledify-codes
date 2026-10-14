import multer from "multer";
import { validateUploadMetadata, MAX_FILE_BYTES } from '../Service/input/fileValidation.mjs';

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,

    limits: {
        fileSize: MAX_FILE_BYTES,
        files: 1,
        fields: 20,
        fieldSize: 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        try { validateUploadMetadata(file); cb(null, true); }
        catch (error) { cb(error); }

    }
});

export default upload;
