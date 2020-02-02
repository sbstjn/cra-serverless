import React from 'react'
import styled from 'styled-components'
import { Helmet } from 'react-helmet-async'
import { Route, Switch } from 'react-router'
import { createGlobalStyle } from 'styled-components'

import { Home } from './pages/Home'
import { Details } from './pages/Details'
import { Navigation } from './components/Navigation'

const GlobalStyles = createGlobalStyle`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`

const Wrapper = styled.div`
  text-align: center;
`

const App: React.FC = () => (
  <>
    <GlobalStyles />

    <Helmet>
      <title>CRA Serverless</title>
    </Helmet>

    <Wrapper>
      <Navigation />

      <Switch>
        <Route path="/details/:id" component={Details} />
        <Route component={Home} />
      </Switch>
    </Wrapper>
  </>
)

export default App
