import { IsString } from 'class-validator'

export class CategoryUpdateDTO {
  @IsString()
  title!: string
}
