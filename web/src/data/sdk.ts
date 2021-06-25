import { GraphQLClient } from 'graphql-request';
import { getSdk, Sdk } from './subgraph';

export function gql(endpoint: string): Sdk {
  return getSdk(new GraphQLClient(endpoint));
}
