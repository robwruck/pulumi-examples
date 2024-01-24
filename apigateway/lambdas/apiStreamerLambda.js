const data = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu fo\n";

exports.handler = awslambda.streamifyResponse(async (event, responseStream, _context) => {
    console.log(event);

    const parts = event.rawPath?.split(/\//) || [];
    const count = (parts.length > 0) ? parseInt(parts[1]) : 1;
    const delay = (parts.length > 1) ? parseInt(parts[2]) : 100;
    console.log("producing " + count + " blocks of size " + data.length + " with a delay of " + delay + " ms");

    for (let i = 0; i < count; i++) {
        responseStream.write(data);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    responseStream.end();
});
