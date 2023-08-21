console.log('Loading function');

const crypto = require("crypto");

function sha512(data) {
    const hash = crypto.createHash("sha512");

    hash.update(data, 'utf8');
    return hash.digest('base64');
}

exports.handler = async (req) => {

    console.log(req);

    // Do some work
    var hashedValue = 'The quick brown fox jumps over the lazy dog.';
    for (var i = 0; i < 4000; i++) {
        hashedValue = sha512(hashedValue);
    }

    const response = {
        version: 42,
        message: 'Hello, World!'
    };

    return response;
};
