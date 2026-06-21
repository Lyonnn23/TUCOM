import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
};

export const auth = {
  signInWithOAuth: async (_provider: "google" | "apple" | "microsoft", opts?: SignInOptions) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: opts?.redirect_uri ?? `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) return { error };
    return { redirected: true, data };
  },
};
