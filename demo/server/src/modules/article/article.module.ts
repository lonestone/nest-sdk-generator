import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { Category } from '../category/category.entity'
import { User } from '../user/user.entity'
import { ArticleController } from './article.controller'
import { Article } from './article.entity'
import { ArticleService } from './article.service'

@Module({
  imports: [MikroOrmModule.forFeature([Article, Category, User])],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
