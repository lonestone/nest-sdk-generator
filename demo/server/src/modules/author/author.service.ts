import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable, NotFoundException } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { Author } from './author.entity'
import { AuthorCreateDTO } from './dtos/author-create.dto'
import { AuthorUpdateDTO } from './dtos/author-update.dto'

@Injectable()
export class AuthorService {
  @InjectRepository(Author)
  private readonly authorRepo!: EntityRepository<Author>

  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  private async getOrFail(id: string): Promise<Author> {
    const author = await this.authorRepo.findOne(id)

    if (!author) {
      throw new NotFoundException('Provided author ID was not found')
    }

    return author
  }

  async getAll(): Promise<Author[]> {
    return this.authorRepo.findAll()
  }

  async articles(id: string): Promise<Article[]> {
    const author = await this.getOrFail(id)
    return this.articleRepo.find({ author })
  }

  async create(dto: AuthorCreateDTO): Promise<Author> {
    const author = this.authorRepo.create(dto)

    await this.authorRepo.persistAndFlush(author)

    return author
  }

  async update(id: string, dto: AuthorUpdateDTO): Promise<Author> {
    const author = await this.getOrFail(id)

    if (dto.displayName != null) {
      author.displayName = dto.displayName
    }

    await this.authorRepo.persistAndFlush(author)

    return author
  }

  async delete(id: string) {
    const author = await this.getOrFail(id)

    await this.authorRepo.removeAndFlush(author)
  }
}
