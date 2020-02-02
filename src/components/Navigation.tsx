import React, { useCallback } from 'react'
import styled from 'styled-components'
import { useLocation, NavLink } from 'react-router-dom'

const activeClassName = 'active'
const StyledLink = styled(NavLink).attrs({
  activeClassName,
})`
  color: tomato;
  font-weight: bold;
  border: 1px solid tomato;
  border-radius: 3px;
  text-decoration: none;
  padding: 2px 6px;

  :hover,
  &:active,
  &:visited {
    color: tomato;
  }

  &.${activeClassName} {
    color: red;
  }
`

const ListItem = styled.li`
  display: inline-block;
  padding: 5px 10px;
`

const List = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`

const Wrapper = styled.div`
  padding-top: 15px;
`

export const Navigation = () => {
  const location = useLocation()

  const isDetailsActive = useCallback(() => {
    return location.pathname.indexOf('details/') > -1
  }, [location.pathname])

  return (
    <Wrapper>
      <List>
        <ListItem>
          <StyledLink to="/" activeClassName={activeClassName} exact>
            Home
          </StyledLink>
        </ListItem>

        <ListItem>
          <StyledLink
            to="/details/foo"
            activeClassName={activeClassName}
            isActive={isDetailsActive}
          >
            Details
          </StyledLink>
        </ListItem>
      </List>
    </Wrapper>
  )
}
