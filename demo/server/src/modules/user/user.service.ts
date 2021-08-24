import { EntityRepository } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { BadRequestException, Injectable } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { UserCreateDTO } from './dtos/user-create.dto'
import { User } from './user.entity'

@Injectable()
export class UserService {
  @InjectRepository(User)
  private readonly userRepo!: EntityRepository<User>

  @InjectRepository(Article)
  private readonly articleRepo!: EntityRepository<Article>

  async getAll(): Promise<User[]> {
    return this.userRepo.findAll()
  }

  async getByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ username })
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ email })
  }

  async articles(id: string): Promise<Article[]> {
    const author = await this.userRepo.findOne(id)

    if (!author) {
      throw new BadRequestException('User was not found!')
    }

    return this.articleRepo.find({ author })
  }

  async create(dto: UserCreateDTO): Promise<User> {
    if (await this.getByUsername(dto.username)) {
      throw new BadRequestException('A user with this username already exists!')
    }

    if (await this.getByEmail(dto.email)) {
      throw new BadRequestException('A user is already registered with this email address!')
    }

    const user = this.userRepo.create(dto)

    await this.userRepo.persistAndFlush(user)

    return user
  }
}
