import React from 'react'
import styled from 'styled-components'

const Link = styled.a`
  color: #9649cb;
`

const Wrapper = styled.div`
  font-weight: bold;
  color: #ccc;
`

export const Footer = () => (
  <Wrapper>
    github.com/
    <Link href="https://sbstjn.com">sbstjn</Link>/
    <Link href="https://github.com/sbstjn/cra-serverless">cra-serverless</Link>
  </Wrapper>
)
