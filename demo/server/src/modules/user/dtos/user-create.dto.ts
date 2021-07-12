import { IsEmail, IsString } from 'class-validator'

export class UserCreateDTO {
  @IsString()
  username!: string

  @IsEmail()
  email!: string

  @IsString()
  displayName!: string
}
