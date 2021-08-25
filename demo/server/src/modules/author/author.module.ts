import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { AuthorController } from './author.controller'
import { Author } from './author.entity'
import { AuthorService } from './author.service'

@Module({
  imports: [MikroOrmModule.forFeature([Author, Article])],
  controllers: [AuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}
