import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { UserCreateDTO } from './dtos/user-create.dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  @Inject()
  private readonly userService!: UserService

  @Get()
  getAll() {
    return this.userService.getAll()
  }

  @Get('by-username/:username')
  getByUsername(@Param('username') username: string) {
    return this.userService.getByEmail(username)
  }

  @Get('by-email/:email')
  getByEmail(@Param('email') email: string) {
    return this.userService.getByEmail(email)
  }

  @Get(':id/articles')
  articles(@Param('id') id: string) {
    return this.userService.articles(id)
  }

  @Post()
  create(@Body() dto: UserCreateDTO) {
    return this.userService.create(dto)
  }
}
