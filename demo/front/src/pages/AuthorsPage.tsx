import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authorController } from '../sdk/authorModule'
import type { Author } from '../sdk/_types/modules/author/author.entity'

export function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[] | null>(null)

  useEffect(() => {
    authorController.getAll().then(setAuthors, (error) => alert(error))
  }, [])

  async function create() {
    const displayName = prompt("Author's name?")

    if (!displayName) {
      return
    }

    const author = await authorController.create({}, { displayName })

    alert('Success!')

    setAuthors(authors ? [...authors, author] : [author])
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
        <button type="button" onClick={create}>
          Create a new author
        </button>
      </p>
    </>
  )
}
