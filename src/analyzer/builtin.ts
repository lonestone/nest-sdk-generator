import { MagicType } from '../config'

export const builtinMagicTypes: MagicType[] = [
  {
    nodeModuleFilePath: '@mikro-orm/core/entity/Collection.d.ts',
    typeName: 'Collection',
    placeholderContent: 'export type Collection<T, _> = Array<T>;',
  },
]
