// gql tag parses the template literal into an AST (DocumentNode) that Apollo expects
import { gql } from '@apollo/client';

// Fetches a single profile row by user UUID.
// pg_graphql auto-generates a collection query per table; filter maps to a WHERE clause.
// Results are wrapped in Relay-style edges/node pagination structure even for single rows.
export const GET_PROFILE = gql`
  query GetProfile($id: UUID!) {
    profilesCollection(filter: { id: { eq: $id } }) {
      edges {
        node {
          id
          name
          monthly_income
          goal
          currency
        }
      }
    }
  }
`;

// Inserts a brand new profile row — used the first time a user completes onboarding.
export const INSERT_PROFILE = gql`
  mutation InsertProfile(
    $id: UUID!
    $name: String
    $monthly_income: BigFloat
    $goal: String
    $currency: String
  ) {
    insertIntoprofilesCollection(
      objects: [{
        id: $id
        name: $name
        monthly_income: $monthly_income
        goal: $goal
        currency: $currency
      }]
    ) {
      records {
        id
        name
        monthly_income
        goal
        currency
      }
    }
  }
`;

// Updates an existing profile row — used when the user edits their profile after onboarding.
// filter targets the row by id so only the current user's row is updated.
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $id: UUID!
    $name: String
    $monthly_income: BigFloat
    $goal: String
    $currency: String
  ) {
    updateprofilesCollection(
      set: {
        name: $name
        monthly_income: $monthly_income
        goal: $goal
        currency: $currency
      }
      filter: { id: { eq: $id } }
    ) {
      records {
        id
        name
        monthly_income
        goal
        currency
      }
    }
  }
`;
