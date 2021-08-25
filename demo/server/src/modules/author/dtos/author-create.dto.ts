import { IsString } from 'class-validator'

export class AuthorCreateDTO {
  @IsString()
  displayName!: string
}
