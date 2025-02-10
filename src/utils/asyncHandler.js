const asyncHandler = (requestHandler) => { //requestHandler is expected to be any function that handles a request and is expected to perform asynchronous operations
    return (req, res, next) => { // Purpose of this middleware is to catch any errors that occur in the requestHandler
        // Wrap the result of calling requestHandler in Promise.resolve()
        // This ensures that even if requestHandler doesn't return a promise,
        // we treat it as a promise so that .catch() works.
        Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error)) 
    }
}

export { asyncHandler }

// const asyncHandler = () => {}
// const asyncHandler = (fn) => {() => {}}
// const asyncHandler = (fn) => async () => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({ success: false, message: error.message })
//     }
// }