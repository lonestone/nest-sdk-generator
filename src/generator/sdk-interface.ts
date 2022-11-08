export const defaultSdkInterface = `
export async function request(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  uri: string,
  body: unknown,
  query: Record<string, string>
): Promise<unknown> {
  const url = new URL('http://localhost:3000' + uri)
  url.search = new URLSearchParams(query).toString()

  const params: RequestInit = {
    method,
    // Required for content to be correctly parsed by NestJS
    headers: { 'Content-Type': 'application/json' },
  }

  // Setting a body is forbidden on GET requests
  if (method !== 'GET') {
    params.body = JSON.stringify(body)
  }

  return fetch(url.toString(), params).then((res) => {
    // Handle failed requests
    if (!res.ok) {
      throw Error(res.statusText)
    }

    return res.json()
  })
}

`.trim()
