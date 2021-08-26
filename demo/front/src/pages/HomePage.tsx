import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArticleCard } from '../components/ArticleCard'
import { articleController } from '../sdk/articleModule'
import type { Article } from '../sdk/_types/modules/article/article.entity'

export function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    articleController.getAll().then(setArticles)
  }, [])

  return (
    <>
      <h1>Home page</h1>
      <p>
        {articles.length === 0 ? (
          <em>No article to display</em>
        ) : (
          <ol>
            {articles.map((article) => (
              <ArticleCard article={article} />
            ))}
          </ol>
        )}
      </p>
      <Link to="/new-article">Create a new article</Link>
    </>
  )
}
