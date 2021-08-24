import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { articleController } from './sdk/articleModule'
import { categoryController } from './sdk/categoryModule'
import { userController } from './sdk/userModule'
import { Article } from './sdk/_types/modules/article/article.entity'
import { Category } from './sdk/_types/modules/category/category.entity'
import { User } from './sdk/_types/modules/user/user.entity'

export function App() {
  const [error, setError] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    userController.getAll().then(setUsers, setError)
  }, [])

  useEffect(() => {
    categoryController.getAll().then(setCategories, setError)
  }, [])

  useEffect(() => {
    articleController.getAll().then(setArticles, setError)
  }, [])

  return error ? (
    <h1 style="color: red;">{error}</h1>
  ) : (
    <div>
      <h1>NSdkGen Demo App</h1>

      <h2>Users</h2>
      <ol>
        {users.map((user) => (
          <li key={user.uuid}>{user.displayName}</li>
        ))}
      </ol>

      <h2>Categories</h2>
      <ol>
        {categories.map((category) => (
          <li key={category.uuid}>{category.title}</li>
        ))}
      </ol>

      <h2>Articles</h2>
      <ol>
        {articles.map((article) => (
          <li key={article.uuid}>{article.title}</li>
        ))}
      </ol>
    </div>
  )
}
