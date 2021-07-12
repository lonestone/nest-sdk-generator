import { Controller, Get, Inject } from '@nestjs/common'
import { ArticleService } from './article.service'

@Controller()
export class ArticleController {
  @Inject()
  private readonly articleService!: ArticleService

  @Get()
  getAll() {
    return this.articleService.getAll()
  }
}
