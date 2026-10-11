const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

['od-proofs', 'medical-certificates', 'od-certificates', 'photos'].forEach(sub => {
    const dir = path.join(UPLOADS_DIR, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function createStorage(subfolder) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(UPLOADS_DIR, subfolder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, unique + ext);
        },
    });
}

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only images (jpg, png, gif, webp) and PDFs are allowed.'), false);
    }
};

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ success: false, message: 'Too many files. Only 1 file is allowed.' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};

const uploadOdProof = multer({
    storage: createStorage('od-proofs'),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).single('file');

const uploadMedicalCertificate = multer({
    storage: createStorage('medical-certificates'),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).single('file');

const uploadOdCertificate = multer({
    storage: createStorage('od-certificates'),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).single('file');

const uploadPhoto = multer({
    storage: createStorage('photos'),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('file');

module.exports = { uploadOdProof, uploadMedicalCertificate, uploadOdCertificate, uploadPhoto, handleUploadError, UPLOADS_DIR };
