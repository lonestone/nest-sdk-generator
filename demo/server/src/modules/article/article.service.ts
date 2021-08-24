import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Category } from '../category/category.entity'
import { User } from '../user/user.entity'
import { Article } from './article.entity'
import { ArticleCreateDTO } from './dtos/article-create.dto'

@Injectable()
export class ArticleService {
  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  @InjectRepository(Category)
  private readonly categoryRepo!: EntityRepository<Category>

  @InjectRepository(User)
  private readonly userRepo!: EntityRepository<User>

  async getAll(): Promise<Article[]> {
    return this.articleRepo.findAll()
  }

  async getBySlug(slug: string): Promise<Article | null> {
    return this.articleRepo.findOne({ slug })
  }

  async create(dto: ArticleCreateDTO): Promise<Article> {
    if (await this.getBySlug(dto.slug)) {
      throw new BadRequestException('An article with this slug already exists!')
    }

    const category = await this.categoryRepo.findOne(dto.categoryId)

    if (!category) {
      throw new BadRequestException('Category was not found')
    }

    const author = await this.userRepo.findOne(dto.authorId)

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
}
