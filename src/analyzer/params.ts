/**
 * @file Analyzer for the source API's controllers' methods' parameters
 */

import { ParameterDeclaration } from 'ts-morph'
import { debug, format, warn } from '../logging'
import { expectSingleStrLitDecorator } from './decorator'
import { SdkHttpMethod } from './methods'
import { paramsOfRoute, Route } from './route'
import { ResolvedTypeDeps, resolveTypeDependencies } from './typedeps'

/**
 * SDK interface for a controller's method's parameters
 */
export interface SdkMethodParams {
  /** Route parameters */
  parameters: Map<string, ResolvedTypeDeps> | null

  /** Query parameters */
  query: Map<string, ResolvedTypeDeps> | null

  /** Body parameters */
  body: SdkMethodBodyParam | null
}

/**
 * Single body parameter in a SDK's method
 */
export type SdkMethodBodyParam = { full: true; type: ResolvedTypeDeps } | { full: false; fields: Map<string, ResolvedTypeDeps> }

/**
 * Generate a SDK interface for a controller's method's parameters
 * @param httpMethod The method's HTTP method
 * @param route The method's route
 * @param args The method's arguments
 * @param filePath Path to the controller's file
 * @param absoluteSrcPath Absolute path to the source directory
 * @returns A SDK interface for the method's parameters
 */
export function analyzeParams(
  httpMethod: SdkHttpMethod,
  route: Route,
  args: ParameterDeclaration[],
  filePath: string,
  absoluteSrcPath: string
): SdkMethodParams | Error {
  // The collected informations we will return
  const collected: SdkMethodParams = {
    parameters: null,
    query: null,
    body: null,
  }

  // Get the named parameters of the route
  const routeParams = paramsOfRoute(route)

  // Treat all arguments (to not confuse with the route's parameters)
  for (const arg of args) {
    const name = arg.getName()

    debug('├───── Detected argument: {yellow}', name)

    // Arguments are collected as soon as they have a decorator like @Query() or @Body()
    const decs = arg.getDecorators()

    if (decs.length === 0) {
      // If we have no argument, this is not an argument we are interested in, so we just skip it
      debug('├───── Skipping this argument as it does not have a decorator')
      continue
    } else if (decs.length > 1) {
      // If we have more than one decorator, this could mean we have for instance an @NotEmpty() @Query() or something like this,
      //  which is currently not supported.
      return new Error('Skipping this argument as it has multiple decorators, which is currently not supported')
    }

    // Get the only decrator
    const dec = decs[0]
    const decName = dec.getName()

    // Treat the @Param() decorator
    if (decName === 'Param') {
      debug('├───── Detected decorator {blue}', '@Param')

      // We expect a single string argument for this decorator,
      // which is the route parameter's name
      const paramName = expectSingleStrLitDecorator(dec)

      if (paramName instanceof Error) return paramName

      // If there is no argument, this argument is a global receiver which maps the full set of parameters
      // We theorically *could* extract the type informations from this object type, but this would be insanely complex
      // So, we just skip it as it's a lot more simple, and is not commonly used anyway as it has a set of downsides
      if (paramName === null) {
        warn('├───── Skipping this argument as it is a generic parameters receiver, which is currently not supported')
        continue
      }

      // Ensure the specified parameter appears in the method's route
      if (!routeParams.includes(paramName)) return new Error(format('├───── Cannot map unknown parameter {yellow}', paramName))

      debug('├───── Mapping argument to parameter: {yellow}', paramName)

      // Get the route parameter's type
      const typ = resolveTypeDependencies(arg.getType(), filePath, absoluteSrcPath)

      debug('├───── Detected parameter type: {yellow} ({magentaBright} dependencies)', typ.resolvedType, typ.dependencies.size)

      // Update the method's route parameters

      if (paramName in {}) {
        return new Error(
          format(`Detected @Param() field whose name {yellow} collides with a JavaScript's native object property`, paramName)
        )
      }

      collected.parameters ??= new Map()
      collected.parameters.set(paramName, typ)
    }

    // Treat the @Query() decorator
    else if (decName === 'Query') {
      debug('├───── Detected decorator {blue}', '@Query')

      // We expect a single string argument for this decorator,
      // which is the query parameter's name
      const queryName = expectSingleStrLitDecorator(dec)

      if (queryName instanceof Error) return queryName

      // If there is no argument, this argument is a global receiver which maps the full set of parameters
      // We theorically *could* extract the type informations from this object type, but this would be insanely complex
      // So, we just skip it as it's a lot more simple, and is not commonly used anyway as it has a set of downsides
      if (queryName === null) {
        warn('├───── Skipping this argument as it is a generic query receiver')
        continue
      }

      debug('├───── Mapping argument to query: {yellow}', queryName)

      // Get the parameter's type
      const typ = resolveTypeDependencies(arg.getType(), filePath, absoluteSrcPath)

      debug(`├───── Detected query type: {yellow} ({magentaBright} dependencies)`, typ.resolvedType, typ.dependencies.size)

      // Update the method's query parameter

      if (queryName in {}) {
        return new Error(
          format(`Detected @Query() field whose name {yellow} collides with a JavaScript's native object property`, queryName)
        )
      }

      collected.query ??= new Map()
      collected.query.set(queryName, typ)
    }

    // Treat the @Body() decorator
    else if (decName === 'Body') {
      debug('├───── Detected decorator {blue}', '@Body')

      // GET requests cannot have a BODY
      if (httpMethod === SdkHttpMethod.Get) {
        return new Error('GET requests cannot have a BODY!')
      }

      // We expect a single string argument for this decorator,
      // which is the body field's name
      const fieldName = expectSingleStrLitDecorator(dec)

      if (fieldName instanceof Error) return fieldName

      // Get the field's type
      const typ = resolveTypeDependencies(arg.getType(), filePath, absoluteSrcPath)

      const depsCount = typ.dependencies.size

      debug(
        `├───── Detected BODY type: {cyan} ({magentaBright} ${
          depsCount === 0 ? 'no dependency' : depsCount > 1 ? 'dependencies' : 'dependency'
        })`,
        typ.resolvedType,
        depsCount
      )

      // If there no name was provided to the decorator, then the decorator is a generic receiver which means it maps to the full body type
      // This also means we can map the BODY type to this argument's type
      if (fieldName === null) {
        const body = collected.body

        // If we previously had an @Body(<name>) decorator on another argument, we have an important risk of mistyping
        // => e.g. `@Body("a") a: string, @Body() body: { a: number }` is invalid as the type for the `a` field mismatches
        // => It's easy to make an error as the @Body() type is often hidden behind a DTO
        // But that's extremely complex to check automatically, so we just display a warning instead
        // Also, that's not the kind of thing we make on purpose very often, so it's more likely it's an error, which makes it even more important
        //  to display a warning here.
        if (body?.full === false)
          warn('├───── Detected full @Body() decorator after a single parameter. This is considered a bad practice, avoid it if you can!')
        // Having two generic @Body() decorators is meaningless and will likey lead to errors, so we return a precise error here
        else if (body?.full) {
          return new Error(
            format(
              `Detected two @Body() decorators: found {yellow} previously, while method argument {yellow} indicates type {yellow}`,
              body.type.resolvedType,
              name,
              typ.resolvedType
            )
          )
        }

        debug("├───── Mapping argument to full request's body")

        // Update the whole BODY type
        collected.body = { full: true, type: typ }
      } else {
        // Here we have an @Body(<string>) decorator

        // If we previously had an @Body() decorator, this can lead to several types of errors (see the big comment above for more informations)
        if (collected.body?.full) {
          warn('├───── Detected single @Body() decorator after a full parameter. This is considered a bad practice, avoid it if you can!')
        } else {
          debug('├───── Mapping argument to BODY field: {yellow}', fieldName)

          // Update the BODY type by adding the current field to it

          if (fieldName in {}) {
            return new Error(
              format(`Detected @Body() field whose name {yellow} collides with a JavaScript's native object property`, fieldName)
            )
          }

          collected.body ??= { full: false, fields: new Map() }

          collected.body.fields.set(fieldName, typ)
        }
      }
    }
  }

  // Success!
  return collected
}
