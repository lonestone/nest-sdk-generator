import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { articleController } from './sdk/articleModule'
import { authorController } from './sdk/authorModule'
import { categoryController } from './sdk/categoryModule'
import { Article } from './sdk/_types/modules/article/article.entity'
import { Author } from './sdk/_types/modules/author/author.entity'
import { Category } from './sdk/_types/modules/category/category.entity'

export function App() {
  const [error, setError] = useState(null)

  const [authors, setAuthors] = useState<Author[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    authorController.getAll().then(setAuthors, setError)
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

      <h2>Authors</h2>
      <ol>
        {authors.map((author) => (
          <li key={author.id}>{author.displayName}</li>
        ))}
      </ol>

      <h2>Categories</h2>
      <ol>
        {categories.map((category) => (
          <li key={category.id}>{category.title}</li>
        ))}
      </ol>

      <h2>Articles</h2>
      <ol>
        {articles.map((article) => (
          <li key={article.id}>{article.title}</li>
        ))}
      </ol>
    </div>
  )
}
