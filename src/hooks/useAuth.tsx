import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "manager" | "engineer";
type LicenseStatus = "active" | "disabled" | "pending" | null;

interface Profile {
  id: string;
  user_id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  f_gas_certificate_number: string | null;
  f_gas_certificate_expiry: string | null;
  f_gas_certificate_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  licenseStatus: LicenseStatus;
  hasActiveLicense: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
  refreshLicense: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
      
      // Fetch license status if user has a company
      if (profileData.company_id) {
        const { data: licenseData } = await supabase
          .from("user_licenses")
          .select("status")
          .eq("user_id", userId)
          .eq("company_id", profileData.company_id)
          .single();
        
        setLicenseStatus(licenseData?.status as LicenseStatus || null);
      }
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesData) {
      setRoles(rolesData.map((r) => r.role as AppRole));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshLicense = async () => {
    if (user && profile?.company_id) {
      const { data: licenseData } = await supabase
        .from("user_licenses")
        .select("status")
        .eq("user_id", user.id)
        .eq("company_id", profile.company_id)
        .single();
      
      setLicenseStatus(licenseData?.status as LicenseStatus || null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error };
    }

    // Create profile after signup
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: fullName,
        email: email,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setLicenseStatus(null);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  
  // Owners are always considered to have an active license
  const hasActiveLicense = roles.includes("owner") || licenseStatus === "active";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        licenseStatus,
        hasActiveLicense,
        isLoading,
        signUp,
        signIn,
        signOut,
        hasRole,
        refreshProfile,
        refreshLicense,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
