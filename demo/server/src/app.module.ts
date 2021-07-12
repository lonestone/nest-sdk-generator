import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import options from './mikro-orm.config'
import { ArticleModule } from './modules/article/article.module'
import { CategoryModule } from './modules/category/category.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [MikroOrmModule.forRoot(options), UserModule, ArticleModule, CategoryModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
