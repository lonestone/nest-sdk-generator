import { IsString } from 'class-validator'

export class AuthorUpdateDTO {
  @IsString()
  displayName?: string
}
