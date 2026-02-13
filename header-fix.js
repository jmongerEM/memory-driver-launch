function handler(event) {
    var request = event.request;
    // Removing the host header forces Lambda to use its own URL host
    delete request.headers.host;
    return request;
}