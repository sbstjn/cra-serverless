import React from 'react'
import { Helmet } from 'react-helmet-async'
import { withRouter } from 'react-router'

export const Details = withRouter(({ match: { params: { id } } }) => (
  <>
    <Helmet>
      <title>Details: {id}</title>
    </Helmet>
    <h2>Details: {id}</h2>
  </>
))
