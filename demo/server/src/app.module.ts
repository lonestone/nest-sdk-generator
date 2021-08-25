import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import options from './mikro-orm.config'
import { ArticleModule } from './modules/article/article.module'
import { AuthorModule } from './modules/author/author.module'
import { CategoryModule } from './modules/category/category.module'

@Module({
  imports: [MikroOrmModule.forRoot(options), AuthorModule, ArticleModule, CategoryModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
