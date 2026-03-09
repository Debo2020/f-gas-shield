import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { offlineDb, hashCredentials, CachedProfile } from "@/lib/offline-db";
import { cacheCompanyData } from "@/lib/sync-service";

type AppRole = "owner" | "manager" | "engineer" | "stores_manager" | "admin" | "auditor" | "read_only";
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
  isOfflineMode: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInOffline: (email: string, password?: string) => Promise<{ error: Error | null }>;
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
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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

    // Cache profile for offline use
    if (profileData) {
      try {
        const credentialHash = await hashCredentials(profileData.email);
        const pendingHash = (window as unknown as Record<string, string>).__pendingPasswordHash || "";
        delete (window as unknown as Record<string, string>).__pendingPasswordHash;
        
        // Preserve existing password_hash if we don't have a new one
        const existing = await offlineDb.cachedProfile.get(userId);
        const passwordHash = pendingHash || existing?.password_hash || "";

        await offlineDb.cachedProfile.put({
          user_id: userId,
          profile: profileData as Profile,
          roles: rolesData?.map((r) => r.role) || [],
          license_status: licenseStatus,
          cached_at: new Date().toISOString(),
          credential_hash: credentialHash,
          password_hash: passwordHash,
        });

        // Cache company data for offline access
        if (profileData.company_id && navigator.onLine) {
          cacheCompanyData(profileData.company_id).catch(console.error);
        }
      } catch (err) {
        console.error("Failed to cache profile:", err);
      }
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

    // Cache password hash for offline login after successful online login
    if (!error) {
      try {
        const passwordHash = await hashCredentials(email + ":" + password);
        const credentialHash = await hashCredentials(email);
        const existing = await offlineDb.cachedProfile.get(credentialHash);
        if (existing) {
          await offlineDb.cachedProfile.update(existing.user_id, { password_hash: passwordHash });
        }
        // If profile hasn't been cached yet, fetchProfile will handle caching
        // We store the password hash temporarily so fetchProfile can use it
        (window as unknown as Record<string, string>).__pendingPasswordHash = passwordHash;
      } catch (err) {
        console.error("Failed to cache password hash:", err);
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setLicenseStatus(null);
    setIsOfflineMode(false);
  };

  // Offline login using cached credentials + password verification
  const signInOffline = async (email: string, password?: string): Promise<{ error: Error | null }> => {
    try {
      if (!password) {
        return { error: new Error("Password is required for offline login.") };
      }

      const credentialHash = await hashCredentials(email);
      
      // Find cached profile matching the email hash
      const cachedProfiles = await offlineDb.cachedProfile.toArray();
      const cached = cachedProfiles.find(p => p.credential_hash === credentialHash);
      
      if (!cached) {
        return { error: new Error("No cached credentials found. Please sign in online first.") };
      }

      // Verify password hash matches what was cached during online login
      const passwordHash = await hashCredentials(email + ":" + password);
      if (cached.password_hash !== passwordHash) {
        return { error: new Error("Invalid password. Please try again or sign in online.") };
      }

      // Check if cache is not too old (7 days)
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (cacheAge > maxAge) {
        return { error: new Error("Cached credentials expired. Please sign in online.") };
      }

      // Set offline mode and load cached data
      setIsOfflineMode(true);
      setProfile(cached.profile);
      setRoles(cached.roles as AppRole[]);
      setLicenseStatus(cached.license_status as LicenseStatus);
      
      // Create a minimal user object for compatibility
      setUser({
        id: cached.user_id,
        email: cached.profile.email,
      } as User);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Offline login failed") };
    }
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
        isOfflineMode,
        signUp,
        signIn,
        signInOffline,
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
