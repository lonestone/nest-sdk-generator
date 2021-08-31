import React, { useEffect, useState } from 'react'
import { Link, useHistory, useParams } from 'react-router-dom'
import { articleController } from '../sdk/articleModule'
import type { Article } from '../sdk/_types/src/modules/article/article.entity'

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const history = useHistory()

  useEffect(() => {
    // Fetch article
    articleController.getOne({ slug }).then(setArticle)
  }, [])

  const handleDelete = async () => {
    if (article && confirm('Do you really want to delete this article?')) {
      // Delete article
      await articleController.delete({ id: article.id })
      alert('Article was succesfully removed!')
      history.push('/')
    }
  }

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
      <p>
        <button onClick={handleDelete}>Delete this article</button>
      </p>
      <Link to="/">&lt;- Home page</Link>
    </>
  )
}
