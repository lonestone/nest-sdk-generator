import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { AuthorDropdown } from '../components/AuthorDropdown'
import { CategoryDropdown } from '../components/CategoryDropdown'
import { articleController } from '../sdk/articleModule'

export function NewArticlePage() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [authorId, setAuthorId] = useState<string | null>('')
  const [categoryId, setCategoryId] = useState<string | null>('')

  const history = useHistory()

  async function submit() {
    if (!authorId) {
      return alert('Please select an author')
    }

    if (!categoryId) {
      return alert('Please select a category')
    }

    const article = await articleController.create(
      {},
      {
        title,
        slug,
        content,
        authorId,
        categoryId,
      },
    )

    history.push(`/articles/${article.slug}`)
  }

  return (
    <>
      <h1>New article</h1>
      <p>
        Author: <AuthorDropdown onSelect={setAuthorId} />
      </p>
      <p>
        Category: <CategoryDropdown onSelect={setCategoryId} />
      </p>
      <p>
        <input
          type="text"
          placeholder="The article's slug..."
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </p>
      <p>
        <input
          type="text"
          placeholder="The article's title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </p>
      <textarea
        placeholder="Redact your article here..."
        cols={80}
        rows={20}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      ></textarea>
      <p>
        <button type="submit" onClick={submit}>
          Submit
        </button>
      </p>
    </>
  )
}
