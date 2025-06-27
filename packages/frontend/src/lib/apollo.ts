import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

// GraphQL endpoint for local subgraph
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/gamedao/protocol'

const httpLink = createHttpLink({
  uri: SUBGRAPH_URL,
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
})
