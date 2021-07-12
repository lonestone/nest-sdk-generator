import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Category } from '../category/category.entity'
import { User } from '../user/user.entity'

@Entity()
export class Article {
  @PrimaryKey({ type: 'string' })
  uuid = v4()

  @Property()
  title!: string

  @Property({ unique: true })
  slug!: string

  @Property()
  content!: string

  @ManyToOne(() => User)
  author!: User

  @ManyToOne(() => Category)
  category!: Category
}
