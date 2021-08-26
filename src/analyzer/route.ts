/**
 * @file Analyzer for the source API's routes in controller methods
 */

import { Collection, Err, ErrMsg, None, Ok, Option, Result, Some } from 'typescript-core'

/**
 * A single URI part
 */
export type RoutePart = { readonly segment: string } | { readonly param: string }

/**
 * A parsed URI path
 */
export interface Route {
  /** Is this an absolute route? (routes starting with a '/') */
  readonly isRoot: boolean

  /** The route's parts */
  readonly parts: RoutePart[]
}

/**
 * Analyze an URI path
 * @param uriPath The URI path to analyze
 */
export function analyzeUri(uriPath: string): Result<Route, string> {
  // Split the URI path into "parts"
  const rawParts = uriPath.split('/')

  // The parsed parts we'll return
  const parts: RoutePart[] = []

  // The current string offset in the URI path
  // This variable is used for error display
  let offset = 0

  /**
   * Find if a specific part of the URI path contains an invalid character
   * @param part The part to check
   * @param pattern The invalid characters to look for, as a regular expression
   * @returns An error message if an invalid character is found, nothing else
   */
  function _findInvalid(part: string, pattern: RegExp): Option<string> {
    if (part.match(pattern)) {
      return Some(uriPath + '\n' + ' '.repeat(offset) + '^')
    } else {
      return None()
    }
  }

  // Treat all parts of the URI path
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i]

    // Ignore empty parts (e.g. "/a///b" will be treated as "/a/b")
    if (part === '') continue

    // Ensure there is no generic character in the path as we don't support them
    const genericErr = _findInvalid(part, /[\*\+\?]/)

    if (genericErr.isSome()) {
      return Err(
        'Generic symbols (* + ?) are not supported as they prevent from determining the right route to use. Found in URI:\n' +
          genericErr.data
      )
    }

    // Check if this part is an URI parameter
    if (part.startsWith(':')) {
      // URI parameters must follow a strict naming
      const paramErr = _findInvalid(part, /[^a-zA-Z0-9_:]/)

      if (paramErr.isSome()) {
        return Err('Invalid character detected in named parameter in URI:\n' + paramErr.data)
      }

      // We got a parameter
      parts.push({ param: part.substr(1) })
    } else {
      // We got a literal part
      parts.push({ segment: part })
    }

    // Update the offset for error display
    offset += part.length + 1
  }

  // Success!
  return Ok({
    isRoot: uriPath.startsWith('/'),
    parts,
  })
}

/**
 * Get the named parameters of a parsed route
 * @param route
 */
export function paramsOfRoute(route: Route): string[] {
  return route.parts.map((part) => ('param' in part ? part.param : null)).filter((e) => e !== null) as string[]
}

/**
 * Convert a route back to its original string
 * @param route
 */
export function unparseRoute(route: Route): string {
  return (route.isRoot ? '/' : '') + route.parts.map((part) => ('segment' in part ? part.segment : ':' + part.param)).join('/')
}

/**
 * Pretty-print a route
 */
export function debugUri(route: Route, color: (str: string) => string): string {
  return (route.isRoot ? '/' : '') + route.parts.map((part) => ('segment' in part ? part.segment : color(':' + part.param))).join('/')
}

/**
 * Resolve a route by providing its required parameters
 * @param route
 * @param params
 */
export function resolveRoute(route: Route, params: Collection<string>): Result<string, string> {
  let uri: string[] = []

  for (const part of route.parts) {
    if ('segment' in part) {
      uri.push(part.segment)
    } else if (!params.hasOwnProperty(part.param)) {
      return ErrMsg('Missing route parameter {}', part.param)
    } else {
      uri.push(params[part.param])
    }
  }

  return Ok((route.isRoot ? '/' : '') + uri.join('/'))
}

/**
 * Resolve a route by providing its required parameters through a callback
 * @param route
 * @param paramsProvider
 */
export function resolveRouteWith(route: Route, paramsProvider: (param: string) => string | null): Result<string, string> {
  let uri: string[] = []

  for (const part of route.parts) {
    if ('segment' in part) {
      uri.push(part.segment)
    } else {
      const param = paramsProvider(part.param)

      if (param === null) {
        return ErrMsg('Missing route parameter {}', part.param)
      } else {
        uri.push(param)
      }
    }
  }

  return Ok((route.isRoot ? '/' : '') + uri.join('/'))
}
