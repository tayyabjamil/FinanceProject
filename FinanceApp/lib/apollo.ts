// ApolloClient   — the main client instance
// InMemoryCache  — normalised in-memory store; Apollo uses this to deduplicate and cache responses
// HttpLink       — terminating link that sends operations over HTTP
// ApolloLink     — base class for building middleware links in the request chain
// Observable     — RxJS-style observable used to handle async link operations
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, Observable } from '@apollo/client';
import { supabase } from './supabase';

// Supabase project URL and anon key — sourced from env at build time via Expo's EXPO_PUBLIC_ prefix
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// HttpLink is the terminating link — it makes the actual HTTP POST to Supabase's pg_graphql endpoint.
// /graphql/v1 is the pg_graphql extension endpoint auto-enabled on all Supabase projects.
const httpLink = new HttpLink({
  uri: `${supabaseUrl}/graphql/v1`,
});

// authLink is a non-terminating middleware link that runs before httpLink on every operation.
// It reads the current session asynchronously and injects auth headers before forwarding.
// We use Observable manually here because ApolloLink's forward() returns an Observable,
// and we need to await a promise (getSession) before we can call forward().
const authLink = new ApolloLink((operation, forward) =>
  new Observable((observer) => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        // Use the session access token if logged in; fall back to anon key for public requests.
        // Supabase requires both headers: apikey for routing, Authorization for RLS evaluation.
        const token = session?.access_token ?? supabaseAnonKey;
        operation.setContext({
          headers: {
            apikey: supabaseAnonKey,       // identifies the Supabase project
            Authorization: `Bearer ${token}`, // evaluated by RLS policies on each table
          },
        });
        // Pass the operation down to the next link in the chain (httpLink)
        forward(operation).subscribe(observer);
      })
      // Surface any auth errors as observable errors so Apollo can handle them
      .catch(observer.error.bind(observer));
  })
);

export const apolloClient = new ApolloClient({
  // ApolloLink.from builds the chain: every request goes through authLink first, then httpLink
  link: ApolloLink.from([authLink, httpLink]),

  // InMemoryCache stores query results normalised by __typename + id.
  // Apollo uses this to automatically update cached data after mutations.
  cache: new InMemoryCache(),

  defaultOptions: {
    query: {
      // network-only bypasses the cache on every query — ensures profile data is always fresh.
      // Without this, Apollo would serve a cached profile even after the user updates it.
      fetchPolicy: 'network-only',
    },
  },
});
