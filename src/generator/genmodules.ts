import * as path from 'path'
import { List, RecordDict } from 'typescript-core'
import { SdkModules } from '../analyzer/controllers'
import { SdkMethod } from '../analyzer/methods'
import { SdkMethodParams } from '../analyzer/params'
import { resolveRouteWith, unparseRoute } from '../analyzer/route'
import { ResolvedTypeDeps } from '../analyzer/typedeps'

// Returned codes are not formatted yet
export function generateSdkModules(modules: SdkModules): RecordDict<string> {
  const genFiles = new RecordDict<string>()

  for (const [moduleName, controllers] of modules) {
    for (const [controllerName, controller] of controllers) {
      const out: string[] = []

      out.push('/// Auto-generated file (NSdkGen)')
      out.push('/// Please do not edit this file - re-generate the SDK using the generator instead.')
      out.push('/// Generated on: ' + new Date().toUTCString())
      out.push('///')
      out.push('/// Parent module: ' + moduleName)
      out.push(`/// Controller: "${controllerName}" registered as "${controller.registrationName}" (${controller.methods.size} routes)`)
      out.push('')
      out.push('import { request } from "../central";')

      const imports = new RecordDict<List<string>>()

      const depsToImport = new List<ResolvedTypeDeps>()

      for (const controller of controllers.values()) {
        for (const method of controller.methods.values()) {
          depsToImport.push(method.returnType)
          method.params.arguments.ifSome((deps) => depsToImport.push(...deps.values()))
          method.params.query.ifSome((deps) => depsToImport.push(...deps.values()))
          method.params.body.ifSome((body) => (body.full ? depsToImport.push(body.type) : depsToImport.push(...body.fields.values())))
        }
      }

      for (const dep of depsToImport) {
        for (const [file, types] of dep.dependencies) {
          imports.getOrSet(file, new List()).pushNew(...types)
        }
      }

      for (const [file, types] of imports) {
        out.push(`import type { ${types.join(', ')} } from "../_types/${file.replace(/\\/g, '/')}";`)
      }

      out.push('')
      out.push(`export default {`)

      for (const [methodName, method] of controller.methods) {
        const ret = method.returnType.resolvedType
        const promised = ret.startsWith('Promise<') ? ret : `Promise<${ret}>`

        out.push('')
        out.push(`  // ${methodName} @ ${unparseRoute(method.route)}`)
        out.push(`  ${method.name}(${stringifySdkMethodParams(method.params)}): ${promised} {`)
        out.push(generateCentralRequest(method).replace(/^/gm, '    '))
        out.push('  },')
      }

      out.push('')
      out.push('};')

      genFiles.set(path.join(moduleName, controller.camelClassName + '.ts'), out.join('\n'))
    }

    // TODO: Generate module file that simply re-exports controllers
    const moduleContent: string[] = []

    moduleContent.push('/// Auto-generated file (NSdkGen)')
    moduleContent.push('/// Please do not edit this file - re-generate the SDK using the generator instead.')
    moduleContent.push('/// Generated on: ' + new Date().toUTCString())
    moduleContent.push('///')
    moduleContent.push('/// Module name: ' + moduleName)
    moduleContent.push('')

    for (const controller of controllers.keys()) {
      moduleContent.push(`export { default as ${controller} } from "./${controller}";`)
    }

    genFiles.set(path.join(moduleName, 'index.ts'), moduleContent.join('\n'))
  }

  return genFiles
}

export function stringifySdkMethodParams(params: SdkMethodParams): string {
  const args = params.arguments.map((rec) => rec.mapToArray((name, type) => `${name}: ${type.resolvedType}`).join(', '))

  const query = params.query.map((rec) => rec.mapToArray((name, type) => `${name}: ${type.resolvedType}`).join(', '))

  const body = params.body.map((body) =>
    body.full ? body.type.resolvedType : '{ ' + body.fields.mapToArray((name, type) => `${name}: ${type.resolvedType}`).join(', ') + ' }'
  )

  return [
    `args: {${args.mapStr((args) => ' ' + args + ' ')}}${args.isNone() && body.isNone() && query.isNone() ? ' = {}' : ''}`,
    `body: ${body.unwrapOr('{}')}${body.isNone() && query.isNone() ? ' = {}' : ''}`,
    `query: {${query.mapStr((query) => ' ' + query + ' ')}}${query.isNone() ? ' = {}' : ''}`,
  ].join(', ')
}

export function generateCentralRequest(method: SdkMethod): string {
  const resolvedRoute = resolveRouteWith(method.route, (param) => '${args.' + param + '}').unwrapWith((err, p) =>
    p('Internal error: failed to resolve route: {}', err)
  )

  return `return request('${method.type}', \`${resolvedRoute}\`, query, body)`
}
