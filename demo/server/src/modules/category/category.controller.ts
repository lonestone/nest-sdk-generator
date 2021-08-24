import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { CategoryService } from './category.service'
import { CategoryCreateDTO } from './dtos/category-create.dto'

@Controller('category')
export class CategoryController {
  @Inject()
  private readonly categoryService!: CategoryService

  @Get()
  getAll() {
    return this.categoryService.getAll()
  }

  @Get('by-title/:title')
  byTitle(@Param('title') title: string) {
    return this.categoryService.getByTitle(title)
  }

  @Get(':id/articles')
  articles(@Param('id') id: string) {
    return this.categoryService.articles(id)
  }

  @Post()
  create(@Body() dto: CategoryCreateDTO) {
    return this.categoryService.create(dto)
  }
}
