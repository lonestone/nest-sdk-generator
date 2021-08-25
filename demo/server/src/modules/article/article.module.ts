import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { Author } from '../author/author.entity'
import { Category } from '../category/category.entity'
import { ArticleController } from './article.controller'
import { Article } from './article.entity'
import { ArticleService } from './article.service'

@Module({
  imports: [MikroOrmModule.forFeature([Article, Category, Author])],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}
