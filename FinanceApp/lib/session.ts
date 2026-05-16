import { supabase } from './supabase';
import { apolloClient } from './apollo';
import { GET_PROFILE, INSERT_PROFILE, UPDATE_PROFILE } from './graphql/queries';

// Union type constraining goal to the four values defined in the profiles table CHECK constraint
export type AppGoal = 'save' | 'budget' | 'reduce_spending' | 'track_money';

// Shape of a user's profile as the app consumes it — camelCase, typed
export type Profile = {
  name: string;
  monthlyIncome: number; // stored as numeric in Postgres, mapped from BigFloat in GraphQL
  goal: AppGoal;
  currency: string; // ISO 4217 code, e.g. 'GBP'
};

// Composite session state returned to the rest of the app.
// hasOnboarded drives routing — if false, the app redirects to the onboarding flow.
export type Session = {
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  email?: string;
  profile?: Profile; // undefined if the user hasn't completed onboarding
};

export async function getSession(): Promise<Session> {
  // getSession() reads from AsyncStorage — fast, no network request.
  // This is how Supabase persists the JWT between app restarts.
  const { data: { session } } = await supabase.auth.getSession();

  // No active session — return early with minimal state.
  // The root layout uses this to redirect to the auth stack.
  if (!session?.user) {
    return { isLoggedIn: false, hasOnboarded: false };
  }

  // Fetch the profile row via GraphQL using the authenticated user's UUID.
  // The generic type argument tells TypeScript the shape of data coming back,
  // since Apollo can't infer it from the gql tag at compile time without codegen.
  const { data } = await apolloClient.query<{
    profilesCollection: {
      edges: { node: { id: string; name: string; monthly_income: string; goal: string; currency: string } }[];
    };
  }>({
    query: GET_PROFILE,
    variables: { id: session.user.id },
  });

  // Unwrap the Relay-style edges/node wrapper — take the first (and only) result.
  // Returns undefined if no profile row exists yet (i.e. user signed up but never onboarded).
  const node = data?.profilesCollection?.edges?.[0]?.node;

  // Map from the GraphQL response shape (snake_case, BigFloat as string)
  // to the app's internal Profile type (camelCase, number).
  const mappedProfile: Profile | undefined = node
    ? {
        name: node.name,
        monthlyIncome: Number(node.monthly_income), // BigFloat arrives as a string — coerce to number
        goal: node.goal as AppGoal,
        currency: node.currency,
      }
    : undefined;

  return {
    isLoggedIn: true,
    hasOnboarded: Boolean(mappedProfile?.name), // name is set during onboarding — reliable proxy for completion
    email: session.user.email,
    profile: mappedProfile,
  };
}

// Supabase Auth (signUp / signIn / signOut) uses the Auth REST API at /auth/v1/*.
// These operations are NOT available via pg_graphql — they go through supabase.auth directly.
export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // signUp does not automatically create a session when email confirmation is disabled.
  // Sign in immediately after so the rest of the flow has a valid JWT to work with.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
}

export async function signIn(email: string, password: string): Promise<boolean> {
  // Returns false instead of throwing so the caller (login screen) can handle it gracefully
  // without wrapping every call in try/catch.
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return false;
  return true;
}

export async function signOut(): Promise<void> {
  // Invalidates the session on Supabase's side and clears the token from AsyncStorage
  await supabase.auth.signOut();

  // Clear the Apollo in-memory cache so the next user who logs in on this device
  // doesn't briefly see the previous user's profile data before their own loads.
  await apolloClient.clearStore();
}

export async function saveProfile(profile: Profile): Promise<void> {
  // getUser() makes a live network request to validate the JWT — more reliable than
  // getSession() immediately after signUp, which can occasionally return a stale token.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const variables = {
    id: user.id,
    name: profile.name,
    monthly_income: String(profile.monthlyIncome), // BigFloat scalar requires a string, not a number
    goal: profile.goal,
    currency: profile.currency,
  };

  // Try update first — if the profile row already exists this is all we need.
  const updateResult = await apolloClient.mutate({ mutation: UPDATE_PROFILE, variables });
  if (updateResult.error) throw new Error(updateResult.error.message);

  // If update affected 0 rows the profile doesn't exist yet — insert it.
  const updated = (updateResult.data as any)?.updateprofilesCollection?.records ?? [];
  if (updated.length === 0) {
    const insertResult = await apolloClient.mutate({ mutation: INSERT_PROFILE, variables });
    if (insertResult.error) throw new Error(insertResult.error.message);
  }
}
