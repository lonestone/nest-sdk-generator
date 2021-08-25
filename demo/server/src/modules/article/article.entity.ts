import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Author } from '../author/author.entity'
import { Category } from '../category/category.entity'

@Entity()
export class Article {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property()
  title!: string

  @Property({ unique: true })
  slug!: string

  @Property()
  content!: string

  @ManyToOne(() => Author)
  author!: Author

  @ManyToOne(() => Category)
  category!: Category
}
