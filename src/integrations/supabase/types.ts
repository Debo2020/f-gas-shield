export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          license_count: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          license_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          license_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          equipment_id: string | null
          file_size: number | null
          file_url: string
          id: string
          inspection_id: string | null
          mime_type: string | null
          name: string
          site_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          equipment_id?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          name: string
          site_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          equipment_id?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          name?: string
          site_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_tag: string | null
          co2_equivalent_tonnes: number | null
          company_id: string
          created_at: string
          id: string
          inspection_frequency_months: number | null
          installation_date: string | null
          is_active: boolean
          last_inspection_date: string | null
          location_description: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_inspection_due: string | null
          notes: string | null
          refrigerant_charge_kg: number
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          serial_number: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          asset_tag?: string | null
          co2_equivalent_tonnes?: number | null
          company_id: string
          created_at?: string
          id?: string
          inspection_frequency_months?: number | null
          installation_date?: string | null
          is_active?: boolean
          last_inspection_date?: string | null
          location_description?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_inspection_due?: string | null
          notes?: string | null
          refrigerant_charge_kg: number
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          serial_number?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          asset_tag?: string | null
          co2_equivalent_tonnes?: number | null
          company_id?: string
          created_at?: string
          id?: string
          inspection_frequency_months?: number | null
          installation_date?: string | null
          is_active?: boolean
          last_inspection_date?: string | null
          location_description?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_inspection_due?: string | null
          notes?: string | null
          refrigerant_charge_kg?: number
          refrigerant_type?: Database["public"]["Enums"]["refrigerant_type"]
          serial_number?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          company_id: string
          created_at: string
          equipment_id: string
          findings: string | null
          id: string
          inspection_date: string
          inspector_certificate_number: string | null
          inspector_id: string | null
          inspector_name: string
          leak_check_performed: boolean
          leak_detected: boolean
          leak_location: string | null
          leak_repaired: boolean | null
          next_inspection_due: string | null
          recommendations: string | null
          refrigerant_added_kg: number | null
          refrigerant_recovered_kg: number | null
          result: Database["public"]["Enums"]["inspection_result"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          equipment_id: string
          findings?: string | null
          id?: string
          inspection_date: string
          inspector_certificate_number?: string | null
          inspector_id?: string | null
          inspector_name: string
          leak_check_performed?: boolean
          leak_detected?: boolean
          leak_location?: string | null
          leak_repaired?: boolean | null
          next_inspection_due?: string | null
          recommendations?: string | null
          refrigerant_added_kg?: number | null
          refrigerant_recovered_kg?: number | null
          result: Database["public"]["Enums"]["inspection_result"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          equipment_id?: string
          findings?: string | null
          id?: string
          inspection_date?: string
          inspector_certificate_number?: string | null
          inspector_id?: string | null
          inspector_name?: string
          leak_check_performed?: boolean
          leak_detected?: boolean
          leak_location?: string | null
          leak_repaired?: boolean | null
          next_inspection_due?: string | null
          recommendations?: string | null
          refrigerant_added_kg?: number | null
          refrigerant_recovered_kg?: number | null
          result?: Database["public"]["Enums"]["inspection_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          f_gas_certificate_expiry: string | null
          f_gas_certificate_number: string | null
          f_gas_certificate_url: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          f_gas_certificate_expiry?: string | null
          f_gas_certificate_number?: string | null
          f_gas_certificate_url?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          f_gas_certificate_expiry?: string | null
          f_gas_certificate_number?: string | null
          f_gas_certificate_url?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string
          city: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_licenses: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string
          created_at: string
          disabled_at: string | null
          email: string | null
          id: string
          license_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id: string
          created_at?: string
          disabled_at?: string | null
          email?: string | null
          id?: string
          license_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string
          created_at?: string
          disabled_at?: string | null
          email?: string | null
          id?: string
          license_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_co2_equivalent: {
        Args: {
          _charge_kg: number
          _refrigerant: Database["public"]["Enums"]["refrigerant_type"]
        }
        Returns: number
      }
      generate_unique_slug: { Args: { company_name: string }; Returns: string }
      get_company_license_count: {
        Args: { company_uuid: string }
        Returns: number
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_available_license: {
        Args: { company_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_create_company: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "manager" | "engineer"
      document_type:
        | "certificate"
        | "invoice"
        | "photo"
        | "declaration"
        | "label"
        | "report"
        | "other"
      inspection_result: "pass" | "pass_with_observations" | "fail" | "deferred"
      refrigerant_type:
        | "R-32"
        | "R-134a"
        | "R-404A"
        | "R-407C"
        | "R-410A"
        | "R-422D"
        | "R-448A"
        | "R-449A"
        | "R-452A"
        | "R-454B"
        | "R-507A"
        | "R-744"
        | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "engineer"],
      document_type: [
        "certificate",
        "invoice",
        "photo",
        "declaration",
        "label",
        "report",
        "other",
      ],
      inspection_result: ["pass", "pass_with_observations", "fail", "deferred"],
      refrigerant_type: [
        "R-32",
        "R-134a",
        "R-404A",
        "R-407C",
        "R-410A",
        "R-422D",
        "R-448A",
        "R-449A",
        "R-452A",
        "R-454B",
        "R-507A",
        "R-744",
        "Other",
      ],
    },
  },
} as const
