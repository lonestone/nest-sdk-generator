import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Author } from '../author/author.entity'
import { Category } from '../category/category.entity'
import { Article } from './article.entity'
import { ArticleCreateDTO } from './dtos/article-create.dto'
import { ArticleUpdateDTO } from './dtos/article-update.dto'

@Injectable()
export class ArticleService {
  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  @InjectRepository(Category)
  private readonly categoryRepo!: EntityRepository<Category>

  @InjectRepository(Author)
  private readonly authorRepo!: EntityRepository<Author>

  private async getOrFail(id: string): Promise<Article> {
    const article = await this.articleRepo.findOne(id)

    if (!article) {
      throw new NotFoundException('Provided article ID was not found')
    }

    return article
  }

  async getAll(): Promise<Article[]> {
    return this.articleRepo.findAll({ populate: true })
  }

  async getBySlug(slug: string): Promise<Article | null> {
    return this.articleRepo.findOne({ slug }, true)
  }

  async create(dto: ArticleCreateDTO): Promise<Article> {
    if (await this.getBySlug(dto.slug)) {
      throw new BadRequestException('An article with this slug already exists!')
    }

    const category = await this.categoryRepo.findOne(dto.categoryId)

    if (!category) {
      throw new BadRequestException('Category was not found')
    }

    const author = await this.authorRepo.findOne(dto.authorId)

    if (!author) {
      throw new BadRequestException('Author was not found')
    }

    const article = this.articleRepo.create({
      ...dto,
      author,
      category,
    })

    await this.articleRepo.persistAndFlush(article)

    return article
  }

  async update(id: string, dto: ArticleUpdateDTO): Promise<Article> {
    const article = await this.getOrFail(id)

    if (dto.title != null) {
      article.title = dto.title
    }

    if (dto.content != null) {
      article.content = dto.content
    }

    await this.articleRepo.persistAndFlush(article)

    return article
  }

  async delete(id: string) {
    const article = await this.getOrFail(id)
    await this.articleRepo.removeAndFlush(article)
  }
}
