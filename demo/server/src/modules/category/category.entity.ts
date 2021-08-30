import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Article } from '../article/article.entity'

@Entity()
export class Category {
  @PrimaryKey({ type: 'string' })
  id: string = v4()

  @Property({ unique: true })
  title!: string

  @OneToMany(() => Article, (article) => article.category)
  articles = new Collection<Category>(this)
}
