import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authorController } from '../sdk/authorModule'
import type { Author } from '../sdk/_types/modules/author/author.entity'

export function AuthorDropdown(props: { onSelect: (id: string) => void }) {
  const [authors, setAuthors] = useState<Author[] | null>(null)

  useEffect(() => {
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
        <select onChange={(e) => props.onSelect(e.target.value)}>
          <option key="" value="" disabled={true} selected={true}></option>
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
