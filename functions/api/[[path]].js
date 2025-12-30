export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  // params.path is an array of the path segments matched by [[path]]
  const path = params.path ? params.path.join('/') : '';
  const destinationUrl = `http://www.centrometeolombardo.com/${path}${url.search}`;

  // Forward the request to the upstream server
  const response = await fetch(destinationUrl, {
    method: request.method,
    headers: request.headers,
    redirect: 'follow'
  });

  // Return the response back to the client
  return response;
}
