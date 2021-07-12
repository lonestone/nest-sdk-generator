import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Article } from '../article/article.entity'

@Entity()
export class User {
  @PrimaryKey({ type: 'string' })
  uuid = v4()

  @Property({ unique: true })
  username!: string

  @Property({ unique: true })
  email!: string

  @Property()
  displayName!: string

  @OneToMany(() => Article, (article) => article.author)
  articles = new Collection<Article>(this)
}
