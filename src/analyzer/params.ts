import { ParameterDeclaration } from 'ts-morph'
import { Err, ErrMsg, None, Ok, Option, RecordDict, Result, Some, debug, format, unreachable, warn } from 'typescript-core'

import { expectSingleStrLitDecorator } from './decorator'
import { SdkHttpMethodType } from './methods'
import { Route, paramsOfRoute } from './route'
import { ResolvedTypeDeps, resolveTypeDependencies, unifyDepsResolutionErrors } from './typedeps'

/**
 * SDK interface for a controller's method's parameters
 */
export interface SdkMethodParams {
  /** Route parameters */
  arguments: Option<RecordDict<ResolvedTypeDeps>>

  /** Query parameters */
  query: Option<RecordDict<ResolvedTypeDeps>>

  /** Body parameters */
  body: Option<SdkMethodBodyParam>
}

/**
 * Single body parameter in a SDK's method
 */
export type SdkMethodBodyParam = { full: true; type: ResolvedTypeDeps } | { full: false; fields: RecordDict<ResolvedTypeDeps> }

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
  httpMethod: SdkHttpMethodType,
  route: Route,
  args: ParameterDeclaration[],
  filePath: string,
  absoluteSrcPath: string
): Result<SdkMethodParams, string> {
  // The collected informations we will return
  const collected: SdkMethodParams = {
    arguments: None(),
    query: None(),
    body: None(),
  }

  // Get the named parameters of the route
  const routeParams = paramsOfRoute(route)

  // Treat all arguments (to not confuse with the route's parameters)
  for (const arg of args) {
    const name = arg.getName()

    debug('>>> Detected argument: {yellow}', name)

    // Arguments are collected as soon as they have a decorator like @Query() or @Body()
    const decs = arg.getDecorators()

    if (decs.length === 0) {
      // If we have no argument, this is not an argument we are interested in, so we just skip it
      debug('>>> Skipping this argument as it does not have a decorator')
      continue
    } else if (decs.length > 1) {
      // If we have more than one decorator, this could mean we have for instance an @NotEmpty() @Query() or something like this,
      //  which is currently not supported.
      return Err('Skipping this argument as it has multiple decorators, which is currently not supported')
    }

    // Get the only decrator
    const dec = decs[0]
    const decName = dec.getName()

    // Treat the @Param() decorator
    if (decName === 'Param') {
      debug('>>> Detected decorator {yellow}', '@Param')

      // We expect a single string argument for this decorator,
      // which is the route parameter's name
      const paramName = expectSingleStrLitDecorator(dec)

      if (paramName.isErr()) return paramName.asErr()

      // If there is no argument, this argument is a global receiver which maps the full set of parameters
      // We theorically *could* extract the type informations from this object type, but this would be insanely complex
      // So, we just skip it as it's a lot more simple, and is not commonly used anyway as it has a set of downsides
      if (paramName.data.isNone()) {
        warn('>>> Skipping this argument as it is a generic parameters receiver, which is currently not supported')
        continue
      }

      // Ensure the specified parameter appears in the method's route
      if (!routeParams.includes(paramName.data.data)) return ErrMsg('>>> Cannot map unknown parameter {yellow}', paramName.data.data)

      debug('>>> Mapping argument to parameter: {yellow}', paramName.data.data)

      // Get the route parameter's type
      const typ = resolveTypeDependencies(arg.getType().getText(), filePath, absoluteSrcPath)

      if (typ.isErr()) return Err(unifyDepsResolutionErrors(typ.err))

      debug(
        '>>> Detected parameter type: {yellow} ({magentaBright} dependencies)',
        typ.data.resolvedType,
        Reflect.ownKeys(typ.data.dependencies).length
      )

      // Update the method's route parameters

      if (paramName.data.data in {}) {
        return Err(
          format(`Detected @Param() field whose name {yellow} collides with a JavaScript's native object property`, paramName.data.data)
        )
      }

      if (collected.arguments.isNone()) {
        collected.arguments = Some(new RecordDict())
      }

      collected.arguments.unwrap().set(paramName.data.data, typ.data)
    }

    // Treat the @Query() decorator
    else if (decName === 'Query') {
      debug('>>> Detected decorator {yellow}', '@Query')

      // We expect a single string argument for this decorator,
      // which is the query parameter's name
      const queryName = expectSingleStrLitDecorator(dec)

      if (queryName.isErr()) return queryName.asErr()

      // If there is no argument, this argument is a global receiver which maps the full set of parameters
      // We theorically *could* extract the type informations from this object type, but this would be insanely complex
      // So, we just skip it as it's a lot more simple, and is not commonly used anyway as it has a set of downsides
      if (queryName.data.isNone()) {
        warn('>>> Skipping this argument as it is a generic query receiver')
        continue
      }

      debug('>>> Mapping argument to query: {yellow}', queryName.data.data)

      // Get the parameter's type
      const typ = resolveTypeDependencies(arg.getType().getText(), filePath, absoluteSrcPath)

      if (typ.isErr()) return Err(unifyDepsResolutionErrors(typ.err))

      debug(
        `>>> Detected query type: {yellow} ({magentaBright} dependencies)`,
        typ.data.resolvedType,
        Reflect.ownKeys(typ.data.dependencies).length
      )

      // Update the method's query parameter

      if (queryName.data.data in {}) {
        return Err(
          format(`Detected @Query() field whose name {yellow} collides with a JavaScript's native object property`, queryName.data.data)
        )
      }

      if (collected.query.isNone()) {
        collected.query = Some(new RecordDict())
      }

      collected.query.unwrap().set(queryName.data.data, typ.data)
    }

    // Treat the @Body() decorator
    else if (decName === 'Body') {
      debug('>>> Detected decorator {yellow}', '@Body')

      // GET requests cannot have a BODY
      if (httpMethod === SdkHttpMethodType.Get) {
        return Err('GET requests cannot have a BODY!')
      }

      // We expect a single string argument for this decorator,
      // which is the body field's name
      const fieldName = expectSingleStrLitDecorator(dec)

      if (fieldName.isErr()) return fieldName.asErr()

      // Get the field's type
      const typ = resolveTypeDependencies(arg.getType().getText(), filePath, absoluteSrcPath)

      if (typ.isErr()) return Err(unifyDepsResolutionErrors(typ.err))

      debug(
        `>>> Detected BODY type: {yellow} ({magentaBright} dependencies)`,
        typ.data.resolvedType,
        Reflect.ownKeys(typ.data.dependencies).length
      )

      // If there no name was provided to the decorator, then the decorator is a generic receiver which means it maps to the full body type
      // This also means we can map the BODY type to this argument's type
      if (fieldName.data.isNone()) {
        const body = collected.body.toNullable()

        // If we previously had an @Body(<name>) decorator on another argument, we have an important risk of mistyping
        // => e.g. `@Body("a") a: string, @Body() body: { a: number }` is invalid as the type for the `a` field mismatches
        // => It's easy to make an error as the @Body() type is often hidden behind a DTO
        // But that's extremely complex to check automatically, so we just display a warning instead
        // Also, that's not the kind of thing we make on purpose very often, so it's more likely it's an error, which makes it even more important
        //  to display a warning here.
        if (body?.full === false)
          warn('>>> Detected full @Body() decorator after a single parameter. This is considered a bad practice, avoid it if you can!')
        // Having two generic @Body() decorators is meaningless and will likey lead to errors, so we return a precise error here
        else if (body?.full) {
          if (body.type.rawType === typ.data.rawType)
            return Err(
              format(
                `Detected two @Body() decorators with mismatching type (found {yellow} previously, but method argument {yellow} indicates type {yellow})`,
                body.type.resolvedType,
                name,
                typ.data.resolvedType
              )
            )
          else return ErrMsg(`Detected two @Body() decorators (though with same mapping type ({yellow})`, typ.data.resolvedType)
        }

        debug(">>> Mapping argument to full request's body")

        // Update the whole BODY type
        collected.body = Some({ full: true, type: typ.data })
      } else {
        // Here we have an @Body(<string>) decorator

        // If we previously had an @Body() decorator, this can lead to several types of errors (see the big comment above for more informations)
        if (collected.body.toBoolean((body) => body.full)) {
          warn('>>> Detected single @Body() decorator after a full parameter. This is considered a bad practice, avoid it if you can!')
        } else {
          debug('>>> Mapping argument to BODY field: {yellow}', fieldName.data.data)

          // Update the BODY type by adding the current field to it

          if (fieldName.data.data in {}) {
            return Err(
              format(`Detected @Body() field whose name {yellow} collides with a JavaScript's native object property`, fieldName.data.data)
            )
          }

          if (collected.body.isNone()) {
            collected.body = Some({ full: false, fields: new RecordDict() })
          }

          const body = collected.body.unwrap()

          if (body.full) unreachable()

          body.fields.set(fieldName.data.data, typ.data)
        }
      }
    }
  }

  // Success!
  return Ok(collected)
}
