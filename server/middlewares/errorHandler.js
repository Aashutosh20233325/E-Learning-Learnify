const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging purposes
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode; // If a status code was already set, use it; otherwise, default to 500
    res.status(statusCode).json({
        success: false,
        message: err.message,
        // Only send stack trace in development mode for security
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export default errorHandler;