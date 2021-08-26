import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ArticleService } from './article.service'
import { ArticleCreateDTO } from './dtos/article-create.dto'
import { ArticleUpdateDTO } from './dtos/article-update.dto'

@Controller('article')
export class ArticleController {
  @Inject()
  private readonly articleService!: ArticleService

  @Get()
  getAll() {
    return this.articleService.getAll()
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.articleService.getBySlug(slug)
  }

  @Post()
  create(@Body() dto: ArticleCreateDTO) {
    return this.articleService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ArticleUpdateDTO) {
    return this.articleService.update(id, dto)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.articleService.delete(id)
  }
}
