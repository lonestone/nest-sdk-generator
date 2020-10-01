import { ClassDeclaration, InterfaceDeclaration } from 'ts-morph'
import { List, O, Result } from 'typescript-core'

import { ResolvedTypeDeps, resolveTypeDependencies, unifyDepsResolutionErrors } from './typedeps'

export function analyzeClassDeps(
  decl: ClassDeclaration | InterfaceDeclaration,
  relativeFilePath: string,
  absoluteSrcPath: string
): Result<List<ResolvedTypeDeps>, string> {
  const toLookup = new List<string>()

  const superClasses = decl.getExtends()

  if (superClasses) {
    for (const sup of O.isArray(superClasses) ? superClasses : [superClasses]) {
      toLookup.push(sup.getType().getText())
    }
  }

  for (const prop of decl.getProperties()) {
    toLookup.push(prop.getType().getText())
  }

  return toLookup
    .resultable((typeText) => resolveTypeDependencies(typeText, relativeFilePath, absoluteSrcPath))
    .mapErr((err) => unifyDepsResolutionErrors(err))
}
