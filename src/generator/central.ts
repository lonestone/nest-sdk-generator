export const CENTRAL_FILE = `

export async function req(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    route: Array<{ segment: string } | { param: string }>,
    args: Record<string, unknown>,
    query: Record<string, unknown>,
    body: unknown
): Promise<any> {
    throw new Error('not implemented yet!')
}

`.trim()
