import { Decoders as d, DecodingError, Err, JsonDecoder, JsonDecoders as j, JsonValue, matchString, Ok, state } from 'typescript-core'
import { SdkContent } from '../analyzer'
import { SdkController } from '../analyzer/controller'
import { SdkModules } from '../analyzer/controllers'
import { ExtractedType, TypeLocation, TypeLocationWithExt, TypesExtractorContent } from '../analyzer/extractor'
import { SdkHttpMethodType, SdkMethod } from '../analyzer/methods'
import { SdkMethodBodyParam, SdkMethodParams } from '../analyzer/params'
import { Route, RoutePart } from '../analyzer/route'
import { ResolvedTypeDeps } from '../analyzer/typedeps'

export const decodeResolvedType: JsonDecoder<ResolvedTypeDeps> = j.mapped({
  rawType: j.string,
  resolvedType: j.string,
  relativeFilePath: j.string,
  dependencies: j.recordOf(j.listOf(j.string)),
  localTypes: j.listOf(j.string),
})

export const decodeMethodParams: JsonDecoder<SdkMethodParams> = j.mapped({
  arguments: j.maybe(j.recordOf(decodeResolvedType)),
  query: j.maybe(j.recordOf(decodeResolvedType)),
  body: j.maybe(
    d.ensure<JsonValue, SdkMethodBodyParam>(
      j.mapped({
        full: d.then(j.boolean, d.typedPrimitive(true)),
        type: decodeResolvedType,
      }),
      j.mapped({
        full: d.then(j.boolean, d.typedPrimitive(false)),
        fields: j.recordOf(decodeResolvedType),
      })
    )
  ),
})

export const decodeRoute: JsonDecoder<Route> = j.mapped({
  isRoot: j.boolean,
  parts: j.arrayOf(d.ensure<JsonValue, RoutePart>(j.mapped({ segment: j.string }), j.mapped({ param: j.string }))),
})

export const decodeMethodType: JsonDecoder<SdkHttpMethodType> = d.then(j.string, (str) =>
  matchString(str, {
    GET: () => Ok(SdkHttpMethodType.Get),
    POST: () => Ok(SdkHttpMethodType.Post),
    PUT: () => Ok(SdkHttpMethodType.Put),
    PATCH: () => Ok(SdkHttpMethodType.Patch),
    DELETE: () => Ok(SdkHttpMethodType.Delete),
    _: () => Err(new DecodingError(state('NoneOfCases', ['f', 'Unknown HTTP method: {}', str]))),
  })
)

export const decodeSdkMethod: JsonDecoder<SdkMethod> = j.mapped({
  name: j.string,
  type: decodeMethodType,
  returnType: decodeResolvedType,
  route: decodeRoute,
  uriPath: j.string,
  params: decodeMethodParams,
})

export const decodeSdkController: JsonDecoder<SdkController> = j.mapped({
  path: j.string,
  camelClassName: j.string,
  registrationName: j.string,
  // classDeps: j.listOf(decodeResolvedType),
  methods: j.recordOf(decodeSdkMethod),
})

export const decodeSdkModules: JsonDecoder<SdkModules> = j.recordOf(j.recordOf(decodeSdkController))

export const decodeTypeLocation: JsonDecoder<TypeLocation> = j.mapped({
  typename: j.string,
  relativePathNoExt: j.string,
})

export const decodeTypeLocationWithExt: JsonDecoder<TypeLocationWithExt> = j.mapped({
  typename: j.string,
  relativePathNoExt: j.string,
  relativePath: j.string,
})

export const decodeExtractedType: JsonDecoder<ExtractedType> = j.mapped({
  typename: j.string,
  relativePathNoExt: j.string,
  relativePath: j.string,
  content: j.string,
  typeParams: j.arrayOf(j.string),
  dependencies: j.arrayOf(decodeTypeLocationWithExt),
})

export const decodeTypesExtractorContent: JsonDecoder<TypesExtractorContent> = j.recordOf(j.recordOf(decodeExtractedType))

export const decodeSdkContent: JsonDecoder<SdkContent> = j.mapped({
  modules: decodeSdkModules,
  types: decodeTypesExtractorContent,
})
