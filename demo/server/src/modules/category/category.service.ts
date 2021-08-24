import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { Category } from './category.entity'
import { CategoryCreateDTO } from './dtos/category-create.dto'

@Injectable()
export class CategoryService {
  @InjectRepository(Category)
  private readonly categoryRepo!: EntityRepository<Category>

  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  async getAll(): Promise<Category[]> {
    return this.categoryRepo.findAll()
  }

  async getByTitle(title: string): Promise<Category | null> {
    return this.categoryRepo.findOne({ title })
  }

  async articles(categoryId: string): Promise<Article[]> {
    const category = await this.categoryRepo.findOne(categoryId)

    if (!category) {
      throw new BadRequestException('Category not found')
    }

    return this.articleRepo.find({ category })
  }

  async create(dto: CategoryCreateDTO): Promise<Category> {
    if (await this.getByTitle(dto.title)) {
      throw new BadRequestException('A category with this title already exists!')
    }

    const category = this.categoryRepo.create(dto)

    await this.categoryRepo.persistAndFlush(category)

    return category
  }
}
