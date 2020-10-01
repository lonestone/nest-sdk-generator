export interface CmdArgs {
  readonly input: string
  readonly output: string
  readonly allowAllImportExt: boolean
  readonly prettify: boolean
  readonly prettierConfig?: string
}
