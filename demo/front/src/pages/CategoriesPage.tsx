import React, { useEffect, useState } from 'react'
import { categoryController } from '../sdk/categoryModule'
import type { Category } from '../sdk/_types/modules/category/category.entity'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null)

  useEffect(() => {
    // Fetch all categories
    categoryController.getAll().then(setCategories, (error) => alert(error))
  }, [])

  const handleCreate = async () => {
    const title = prompt("Category's name?")
    if (!title) return

    // Create category
    const category = await categoryController.create({}, { title })
    setCategories(categories ? [...categories, category] : [category])
    alert('Success!')
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
            <li key={category.id}>{category.title}</li>
          ))}
        </ul>
      )}
      <p>
        <button type="button" onClick={handleCreate}>
          Create a new category
        </button>
      </p>
    </>
  )
}
