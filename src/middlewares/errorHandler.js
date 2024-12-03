const handleErrors = (err, req, res, next) => {
    console.error('Unhandled error:', err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: err.details || null,
    });
};

module.exports = { handleErrors };
