import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Article } from '../article/article.entity'

@Entity()
export class Author {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property()
  displayName!: string

  @OneToMany(() => Article, (article) => article.author)
  articles = new Collection<Article>(this)
}
