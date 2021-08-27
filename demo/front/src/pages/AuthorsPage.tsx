import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authorController } from '../sdk/authorModule'
import type { Author } from '../sdk/_types/modules/author/author.entity'

export function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[] | null>(null)

  useEffect(() => {
    // Fetch all authors
    authorController.getAll().then(setAuthors, (error) => alert(error))
  }, [])

  const handleCreate = async () => {
    const displayName = prompt("Author's name?")
    if (!displayName) return
    // Create new author
    const author = await authorController.create({}, { displayName })
    setAuthors(authors ? [...authors, author] : [author])
    alert('Success!')
  }

  return (
    <>
      <h1>Authors</h1>
      {authors === null ? (
        <em>Loading...</em>
      ) : authors.length === 0 ? (
        <em>No author to display</em>
      ) : (
        <ul>
          {authors.map((author) => (
            <li key={author.id}>
              {author.displayName}{' '}
              <Link to={`/articles/from/${author.id}`}>(written articles)</Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <button type="button" onClick={handleCreate}>
          Create a new author
        </button>
      </p>
    </>
  )
}
