import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { Author } from './author.entity'
import { AuthorService } from './author.service'
import { AuthorCreateDTO } from './dtos/author-create.dto'
import { AuthorUpdateDTO } from './dtos/author-update.dto'

@Controller('author')
export class AuthorController {
  @Inject()
  private readonly authorService!: AuthorService

  @Get()
  getAll() {
    return this.authorService.getAll()
  }

  @Get('by-username/:username')
  getByUsername(@Param('username') username: string) {
    return this.authorService.getByEmail(username)
  }

  @Get('by-email/:email')
  getByEmail(@Param('email') email: string) {
    return this.authorService.getByEmail(email)
  }

  @Get(':id/articles')
  articles(@Param('id') id: string) {
    return this.authorService.articles(id)
  }

  @Post()
  create(@Body() dto: AuthorCreateDTO) {
    return this.authorService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AuthorUpdateDTO): Promise<Author> {
    return this.authorService.update(id, dto)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.authorService.delete(id)
  }
}
