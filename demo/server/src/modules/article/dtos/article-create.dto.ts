import { IsString } from 'class-validator'

export class ArticleCreateDTO {
  @IsString()
  title!: string

  @IsString()
  slug!: string

  @IsString()
  content!: string

  @IsString()
  authorId!: string

  @IsString()
  categoryId!: string
}
