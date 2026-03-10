import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const EVENT_SCORES: Record<string, number> = {
  account_created: 5,
  first_site: 15,
  first_equipment: 20,
  document_uploaded: 20,
  first_inspection: 30,
  team_member_invited: 10,
  first_certificate: 20,
};

interface OnboardingProgress {
  step_create_site: boolean;
  step_add_equipment: boolean;
  step_first_inspection: boolean;
  step_first_certificate: boolean;
  completed_at: string | null;
}

interface ActivationState {
  score: number;
  isActivated: boolean;
  activatedAt: string | null;
  progress: OnboardingProgress;
  loading: boolean;
}

export function useActivationScore() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ActivationState>({
    score: 0,
    isActivated: false,
    activatedAt: null,
    progress: {
      step_create_site: false,
      step_add_equipment: false,
      step_first_inspection: false,
      step_first_certificate: false,
      completed_at: null,
    },
    loading: true,
  });
  const initRef = useRef(false);

  const fetchState = useCallback(async () => {
    if (!user || !profile?.company_id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const [scoreRes, progressRes] = await Promise.all([
        supabase
          .from("activation_scores")
          .select("total_score, is_activated, activated_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("onboarding_progress")
          .select("step_create_site, step_add_equipment, step_first_inspection, step_first_certificate, completed_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setState({
        score: scoreRes.data?.total_score || 0,
        isActivated: scoreRes.data?.is_activated || false,
        activatedAt: scoreRes.data?.activated_at || null,
        progress: progressRes.data || {
          step_create_site: false,
          step_add_equipment: false,
          step_first_inspection: false,
          step_first_certificate: false,
          completed_at: null,
        },
        loading: false,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user, profile?.company_id]);

  // Record an activation event (idempotent — duplicate event_type per user is ignored)
  const recordEvent = useCallback(async (eventType: string) => {
    if (!user || !profile?.company_id) return;

    const score = EVENT_SCORES[eventType];
    if (!score) return;

    try {
      // Insert event (unique constraint on user_id + event_type handles idempotency)
      const { error: insertError } = await supabase
        .from("activation_events")
        .insert({
          company_id: profile.company_id,
          user_id: user.id,
          event_type: eventType,
          score,
        });

      // 23505 = unique violation — event already recorded, skip
      if (insertError && insertError.code !== "23505") {
        console.error("Failed to record activation event:", insertError);
        return;
      }

      // If duplicate, don't recalculate
      if (insertError?.code === "23505") return;

      // Recalculate score via RPC
      await supabase.rpc("recalculate_activation_score", { _user_id: user.id });

      // Refresh state
      await fetchState();
    } catch (err) {
      console.error("Error recording activation event:", err);
    }
  }, [user, profile?.company_id, fetchState]);

  // Update onboarding progress step
  const updateProgress = useCallback(async (step: keyof OnboardingProgress, value: boolean) => {
    if (!user || !profile?.company_id || step === "completed_at") return;

    try {
      // Upsert progress record
      const { error } = await supabase
        .from("onboarding_progress")
        .upsert({
          user_id: user.id,
          company_id: profile.company_id,
          [step]: value,
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Failed to update onboarding progress:", error);
        return;
      }

      setState(prev => ({
        ...prev,
        progress: { ...prev.progress, [step]: value },
      }));
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  }, [user, profile?.company_id]);

  // Record event and update corresponding progress step together
  const recordEventWithProgress = useCallback(async (
    eventType: string,
    progressStep?: keyof OnboardingProgress
  ) => {
    await recordEvent(eventType);
    if (progressStep) {
      await updateProgress(progressStep, true);
    }
  }, [recordEvent, updateProgress]);

  // Initial load + auto-record account_created
  useEffect(() => {
    if (!user || !profile?.company_id) return;

    const init = async () => {
      await fetchState();

      if (!initRef.current) {
        initRef.current = true;
        // Auto-record account_created on first load
        await recordEvent("account_created");
        // Ensure onboarding_progress row exists
        await supabase
          .from("onboarding_progress")
          .upsert({
            user_id: user.id,
            company_id: profile.company_id,
          }, { onConflict: "user_id" });
      }
    };

    init();
  }, [user, profile?.company_id, fetchState, recordEvent]);

  return {
    ...state,
    recordEvent,
    updateProgress,
    recordEventWithProgress,
    refreshScore: fetchState,
  };
}
