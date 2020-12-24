import * as path from 'path'
import { Node, Project } from 'ts-morph'
import { Err, ErrMsg, format, Ok, Result } from 'typescript-core'

/**
 * Get the name of a module
 * @param project TS-Morph project the module is contained in
 * @param modulePath Path to the module's file
 * @param sourcePath Path to the TypeScript root directory
 */
export function getModuleName(project: Project, modulePath: string, sourcePath: string): Result<string, string> {
  // Prepare the source file to analyze
  const file = project.getSourceFileOrThrow(path.resolve(sourcePath, modulePath))

  // Find the module class declaration
  const classDecl = file.forEachChildAsArray().find((node) => Node.isClassDeclaration(node) && node.getDecorators().length > 0)

  if (!classDecl) {
    return ErrMsg('No class declaration found in module at {yellow}', modulePath)
  }

  if (!Node.isClassDeclaration(classDecl))
    return Err('Internal error: found class declaration statement which is not an instance of ClassDeclaration')

  const moduleName = classDecl.getName()

  if (moduleName === undefined) {
    return Err('Internal error: failed to retrieve name of declared class')
  }

  const decorators = classDecl.getDecorators()

  if (decorators.length > 1) {
    return ErrMsg(`Found multiple decorators on module class {yellow} declared at {yellow}`, moduleName, modulePath)
  }

  const decName = decorators[0].getName()

  if (decName !== 'Module') {
    return Err(
      format(
        `The decorator on module class {yellow} was expected to be a {yellow}, found an {yellow} instead\nModule path is: {yellow}`,
        moduleName,
        '@Module',
        '@' + decName,
        modulePath
      )
    )
  }

  return Ok(moduleName.substr(0, 1).toLocaleLowerCase() + moduleName.substr(1))
}
