import React from 'react'
import { Link } from 'react-router-dom'
import type { Article } from '../sdk/_types/src/modules/article/article.entity'

interface Props {
  article: Article
}

export function ArticleCard({ article }: Props) {
  return (
    <div>
      <h2>{article.title}</h2>
      <p>
        by <em>{article.author.displayName}</em>
      </p>
      <pre>
        {article.content.length < 100
          ? article.content
          : article.content.substr(0, 100) + '...'}
      </pre>
      <Link to={`/article/${article.slug}`}>Read more</Link>
      <hr />
    </div>
  )
}
