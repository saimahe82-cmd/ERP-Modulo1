function errorHandler(err, req, res, next) {
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.error(`[${requestId}] Error:`, err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[${requestId}] Stack:`, err.stack);
    }

    let statusCode = err.statusCode || 500;

    if (err.name === 'ValidationError') statusCode = 400;
    else if (err.name === 'CastError') statusCode = 400;
    else if (err.code === 11000) statusCode = 409;

    const response = {
        success: false,
        message: err.message || 'Internal Server Error',
        requestId,
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
