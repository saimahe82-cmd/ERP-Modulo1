require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const seedData = require('./utils/seedData');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leaveRoutes = require('./routes/leaves');
const notificationRoutes = require('./routes/notifications');
const studentExtraRoutes = require('./routes/studentExtra');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required environment variables
if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET not set in .env file');
    process.exit(1);
}

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});
app.use('/api/', generalLimiter);
app.use('/api/auth/student-login', authLimiter);
app.use('/api/auth/faculty-login', authLimiter);
app.use('/api/auth/hod-login', authLimiter);
app.use('/api/auth/student-signup', authLimiter);
app.use('/api/auth/staff-signup', authLimiter);
app.use('/api/auth/hod-signup', authLimiter);

// Request timeout
app.use((req, res, next) => {
    req.setTimeout(30000, () => {
        res.status(408).json({ success: false, message: 'Request timeout' });
    });
    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/student-extra', studentExtraRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'College Leave System API is running',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

// Start server
async function start() {
    console.log('College Leave System Backend');
    console.log('============================');

    // Mongoose global config: convert _id to id in JSON output
    mongoose.set('toJSON', {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    });

    let mongoURI = process.env.MONGODB_URI;

    try {
        if (mongoURI) {
            await mongoose.connect(mongoURI);
            console.log('Connected to MongoDB Atlas');
        } else {
            throw new Error('MONGODB_URI not set in .env file');
        }
    } catch (err) {
        console.warn('MongoDB Atlas connection failed, falling back to in-memory MongoDB.');
        console.warn(err.message);

        try {
            const memoryServer = await MongoMemoryServer.create();
            mongoURI = memoryServer.getUri();
            await mongoose.connect(mongoURI);
            console.log('Connected to in-memory MongoDB');
        } catch (memoryErr) {
            console.error('Unable to start in-memory MongoDB:', memoryErr.message);
            process.exit(1);
        }
    }

    await seedData();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`API base URL: http://localhost:${PORT}/api`);
    });
}

start();
