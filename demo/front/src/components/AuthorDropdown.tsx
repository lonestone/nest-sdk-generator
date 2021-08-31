import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authorController } from '../sdk/authorModule'
import type { Author } from '../sdk/_types/src/modules/author/author.entity'

interface Props {
  value: string | undefined
  onChange: (id: string) => void
}

export function AuthorDropdown({ value, onChange }: Props) {
  const [authors, setAuthors] = useState<Author[] | undefined>(undefined)

  useEffect(() => {
    // Fetch all authors
    authorController.getAll().then(setAuthors, (error) => alert(error))
  }, [])

  if (!authors) {
    return <em>Loading...</em>
  }

  return (
    <>
      {authors.length === 0 ? (
        <em>No author available</em>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Select an author
          </option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.displayName}
            </option>
          ))}
        </select>
      )}{' '}
      <Link to="/authors">(manage)</Link>
    </>
  )
}
