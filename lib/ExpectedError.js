const fs=require('fs');
/**
 * A custom MyError class
 * @class
 */
class ExpectedError extends Error {
    /**
     * Constructs the MyError class
     * @param {String} message an error message
     * @constructor
     */
    constructor(message) {
        super(message);
        // properly capture stack trace in Node.js
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        fs.appendFileSync('_error.expected.log',this.stack+"\r\n-------------------------------\r\n");
    }
}
module.exports=ExpectedError;