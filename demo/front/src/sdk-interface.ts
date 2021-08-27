export async function request(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  uri: string,
  query: Record<string, string>,
  body: unknown,
): Promise<any> {
  const url = new URL('http://localhost:3000' + uri)
  url.search = new URLSearchParams(query).toString()

  const params: RequestInit = { method }

  if (method !== 'GET') {
    params.body = JSON.stringify(body)
  }

  return fetch(url.toString(), params).then((res) => res.json())
}
