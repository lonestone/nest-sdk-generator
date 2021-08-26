import React from 'react'
import { Link } from 'react-router-dom'
import type { Article } from '../sdk/_types/modules/article/article.entity'

export function ArticleCard({ article }: { article: Article }) {
  return (
    <div>
      <strong>{article.title}</strong> by <em>{article.author.displayName}</em>
      <pre>
        {article.content.length < 100
          ? article.content
          : article.content.substr(0, 100) + '...'}
      </pre>
      <Link to={`/article/${article.slug}`}>Read more</Link>
    </div>
  )
}
