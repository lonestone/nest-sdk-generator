import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { CategoryController } from './category.controller'
import { Category } from './category.entity'
import { CategoryService } from './category.service'

@Module({
  imports: [MikroOrmModule.forFeature([Category, Article])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
