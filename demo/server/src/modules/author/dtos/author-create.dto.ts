import { IsEmail, IsString } from 'class-validator'

export class AuthorCreateDTO {
  @IsString()
  username!: string

  @IsEmail()
  email!: string

  @IsString()
  displayName!: string
}
