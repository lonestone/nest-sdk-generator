import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { ArticlePage } from './pages/ArticlePage'
import { AuthorsPage } from './pages/AuthorsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { HomePage } from './pages/HomePage'
import { NewArticlePage } from './pages/NewArticlePage'

export function App() {
  return (
    <Router>
      <Switch>
        <Route path="/new-article">
          <NewArticlePage />
        </Route>
        <Route path="/authors">
          <AuthorsPage />
        </Route>
        <Route path="/categories">
          <CategoriesPage />
        </Route>
        <Route path="/article/:slug">
          <ArticlePage />
        </Route>
        <Route path="/">
          <HomePage />
        </Route>
      </Switch>
    </Router>
  )
}
