import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryController } from '../sdk/categoryModule'
import type { Category } from '../sdk/_types/modules/category/category.entity'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null)

  useEffect(() => {
    categoryController.getAll().then(setCategories, (error) => alert(error))
  }, [])

  async function create() {
    const title = prompt("Category's name?")

    if (!title) {
      return
    }

    const category = await categoryController.create({}, { title })

    alert('Success!')

    setCategories(categories ? [...categories, category] : [category])
  }

  return (
    <>
      <h1>Categories</h1>
      {categories === null ? (
        <em>Loading...</em>
      ) : categories.length === 0 ? (
        <em>No category to display</em>
      ) : (
        <ul>
          {categories.map((category) => (
            <li key={category.id}>
              {category.title}{' '}
              <Link to={`/categories/${category.id}`}>(articles)</Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <button type="button" onClick={create}>
          Create a new category
        </button>{' '}
      </p>
    </>
  )
}