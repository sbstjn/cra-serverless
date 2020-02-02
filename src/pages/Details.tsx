import React from 'react'
import { withRouter } from 'react-router'

export const Details = withRouter(({ match }) => {
  return <h2>Details: {match.params.id}</h2>
})
