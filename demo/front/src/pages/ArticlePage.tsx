import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { articleController } from '../sdk/articleModule'
import type { Article } from '../sdk/_types/modules/article/article.entity'

export function ArticlePage() {
  const { slug }: { slug: string } = useParams()

  const [article, setArticle] = useState<Article | null>(null)

  useEffect(() => {
    articleController.getOne({ slug }).then(setArticle)
  }, [])

  if (article === null) {
    return (
      <h1>
        <em>Loading...</em>
      </h1>
    )
  }

  return (
    <>
      <h1>
        {article.title}{' '}
        <em>
          by <strong>{article.author.displayName}</strong>
        </em>
      </h1>
      <pre style={{ width: '50%', whiteSpace: 'break-spaces' }}>
        {article.content}
      </pre>
      <Link to="/">&lt;- Home page</Link>
    </>
  )
}
