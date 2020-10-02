export const CENTRAL_FILE = `

export async function req(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    uri: string,
    query: Record<string, unknown>,
    body: unknown
): Promise<any> {
    console.warn('Not implemented: calling route from Central: ' + route);
    throw new Error('not implemented yet!');
}

`.trim()
