import { IsOptional, IsString } from 'class-validator'

export class ArticleUpdateDTO {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  content?: string
}
