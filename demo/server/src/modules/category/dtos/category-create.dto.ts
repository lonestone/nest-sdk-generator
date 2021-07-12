import { IsString } from 'class-validator'

export class CategoryCreateDTO {
  @IsString()
  title!: string
}
