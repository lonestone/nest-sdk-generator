import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { Category } from './category.entity'
import { CategoryCreateDTO } from './dtos/category-create.dto'
import { CategoryUpdateDTO } from './dtos/category-update.dto'

@Injectable()
export class CategoryService {
  @InjectRepository(Category)
  private readonly categoryRepo!: EntityRepository<Category>

  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  private async getOrFail(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne(id)

    if (!category) {
      throw new NotFoundException('Provided author ID was not found')
    }

    return category
  }

  async getAll(): Promise<Category[]> {
    return this.categoryRepo.findAll()
  }

  async getByTitle(title: string): Promise<Category | null> {
    return this.categoryRepo.findOne({ title })
  }

  async articles(id: string): Promise<Article[]> {
    const category = await this.getOrFail(id)
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

  async update(id: string, dto: CategoryUpdateDTO): Promise<Category> {
    const category = await this.getOrFail(id)

    category.title = dto.title

    await this.categoryRepo.persistAndFlush(category)

    return category
  }

  async delete(id: string) {
    const category = await this.getOrFail(id)
    await this.categoryRepo.removeAndFlush(category)
  }
}
