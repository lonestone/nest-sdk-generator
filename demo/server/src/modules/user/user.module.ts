import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { Article } from '../article/article.entity'
import { UserController } from './user.controller'
import { User } from './user.entity'
import { UserService } from './user.service'

@Module({
  imports: [MikroOrmModule.forFeature([User, Article])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
