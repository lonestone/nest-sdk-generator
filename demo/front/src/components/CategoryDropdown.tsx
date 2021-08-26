import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryController } from '../sdk/categoryModule'
import type { Category } from '../sdk/_types/modules/category/category.entity'

export function CategoryDropdown(props: { onSelect: (id: string) => void }) {
  const [categories, setCategories] = useState<Category[] | null>(null)

  useEffect(() => {
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
        <select onChange={(e) => props.onSelect(e.target.value)}>
          <option key="" value="" disabled={true} selected={true}></option>
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
