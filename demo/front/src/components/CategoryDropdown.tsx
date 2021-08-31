import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryController } from '../sdk/categoryModule'
import type { Category } from '../sdk/_types/src/modules/category/category.entity'

interface Props {
  value: string | undefined
  onChange: (id: string) => void
}

export function CategoryDropdown({ value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[] | undefined>(
    undefined,
  )

  useEffect(() => {
    // Fetch all categories
    categoryController.getAll().then(setCategories, (error) => alert(error))
  }, [])

  if (!categories) {
    return <em>Loading...</em>
  }

  return (
    <>
      {categories.length === 0 ? (
        <em>No category available</em>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled selected>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      )}{' '}
      <Link to="/categories">(manage)</Link>
    </>
  )
}
