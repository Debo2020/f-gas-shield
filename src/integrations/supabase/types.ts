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
      addon_licenses: {
        Row: {
          addon_type: Database["public"]["Enums"]["addon_type"]
          assigned_at: string | null
          assigned_by: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          addon_type: Database["public"]["Enums"]["addon_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          addon_type?: Database["public"]["Enums"]["addon_type"]
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_usage: {
        Row: {
          company_id: string
          created_at: string
          credits_used: number
          id: string
          reported_to_stripe: boolean | null
          request_type: string
          stripe_meter_event_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credits_used?: number
          id?: string
          reported_to_stripe?: boolean | null
          request_type?: string
          stripe_meter_event_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credits_used?: number
          id?: string
          reported_to_stripe?: boolean | null
          request_type?: string
          stripe_meter_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          org_id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          email: string
          id: string
          invited_by: string | null
          status: string
          token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gas_safe_reg_no: string | null
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
          gas_safe_reg_no?: string | null
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
          gas_safe_reg_no?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_addons: {
        Row: {
          addon_type: Database["public"]["Enums"]["addon_type"]
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          addon_type: Database["public"]["Enums"]["addon_type"]
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          addon_type?: Database["public"]["Enums"]["addon_type"]
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_certificates: {
        Row: {
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["company_certificate_type"]
          company_id: string
          created_at: string
          document_id: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issued_date: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["company_certificate_type"]
          company_id: string
          created_at?: string
          document_id?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issued_date: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: Database["public"]["Enums"]["company_certificate_type"]
          company_id?: string
          created_at?: string
          document_id?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issued_date?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_certificates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          license_count: number
          metered_subscription_item_id: string | null
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
          metered_subscription_item_id?: string | null
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
          metered_subscription_item_id?: string | null
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
      contact_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          bucket_id: string | null
          company_id: string
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          equipment_id: string | null
          expiry_date: string | null
          file_size: number | null
          file_url: string
          id: string
          inspection_id: string | null
          mime_type: string | null
          name: string
          profile_id: string | null
          site_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          equipment_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          name: string
          profile_id?: string | null
          site_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          equipment_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          inspection_id?: string | null
          mime_type?: string | null
          name?: string
          profile_id?: string | null
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
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          deleted_at: string | null
          deleted_by: string | null
          gwp: number | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          gwp?: number | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          gwp?: number | null
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
      gas_certificate_appliances: {
        Row: {
          appliance_inspected: boolean | null
          appliance_safe_to_use: boolean | null
          appliance_serviced: boolean | null
          appliance_type: string | null
          certificate_id: string
          created_at: string
          flue_performance_test: string | null
          flue_type: string | null
          heat_input_kw: number | null
          high_co_ppm: number | null
          high_co_ratio: number | null
          high_co2_percent: number | null
          id: string
          landlord_appliance: boolean | null
          location: string | null
          low_co_ppm: number | null
          low_co_ratio: number | null
          low_co2_percent: number | null
          make: string | null
          model: string | null
          operating_pressure_mbar: number | null
          performance_test_result: string | null
          position: number
          safety_devices_correct: boolean | null
          updated_at: string
          ventilation_satisfactory: boolean | null
          visual_condition_satisfactory: boolean | null
          warning_label_attached: boolean | null
          warning_notice_issued: boolean | null
        }
        Insert: {
          appliance_inspected?: boolean | null
          appliance_safe_to_use?: boolean | null
          appliance_serviced?: boolean | null
          appliance_type?: string | null
          certificate_id: string
          created_at?: string
          flue_performance_test?: string | null
          flue_type?: string | null
          heat_input_kw?: number | null
          high_co_ppm?: number | null
          high_co_ratio?: number | null
          high_co2_percent?: number | null
          id?: string
          landlord_appliance?: boolean | null
          location?: string | null
          low_co_ppm?: number | null
          low_co_ratio?: number | null
          low_co2_percent?: number | null
          make?: string | null
          model?: string | null
          operating_pressure_mbar?: number | null
          performance_test_result?: string | null
          position?: number
          safety_devices_correct?: boolean | null
          updated_at?: string
          ventilation_satisfactory?: boolean | null
          visual_condition_satisfactory?: boolean | null
          warning_label_attached?: boolean | null
          warning_notice_issued?: boolean | null
        }
        Update: {
          appliance_inspected?: boolean | null
          appliance_safe_to_use?: boolean | null
          appliance_serviced?: boolean | null
          appliance_type?: string | null
          certificate_id?: string
          created_at?: string
          flue_performance_test?: string | null
          flue_type?: string | null
          heat_input_kw?: number | null
          high_co_ppm?: number | null
          high_co_ratio?: number | null
          high_co2_percent?: number | null
          id?: string
          landlord_appliance?: boolean | null
          location?: string | null
          low_co_ppm?: number | null
          low_co_ratio?: number | null
          low_co2_percent?: number | null
          make?: string | null
          model?: string | null
          operating_pressure_mbar?: number | null
          performance_test_result?: string | null
          position?: number
          safety_devices_correct?: boolean | null
          updated_at?: string
          ventilation_satisfactory?: boolean | null
          visual_condition_satisfactory?: boolean | null
          warning_label_attached?: boolean | null
          warning_notice_issued?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gas_certificate_appliances_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "gas_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_certificates: {
        Row: {
          actions_required: string | null
          actions_taken: string | null
          actual_pressure_drop: number | null
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["gas_certificate_type"]
          classification:
            | Database["public"]["Enums"]["gas_warning_classification"]
            | null
          client_id: string | null
          co_alarm_fitted: boolean | null
          co_alarm_present: boolean | null
          co_alarm_satisfactory: boolean | null
          comments: string | null
          company_id: string
          created_at: string
          customer_address: string | null
          customer_company: string | null
          customer_mobile: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_postcode: string | null
          declaration_type: string | null
          defects: Json | null
          emergency_control_accessible: boolean | null
          engineer_id: string
          equipotential_bonding: boolean | null
          fault_details: string | null
          gas_tightness_satisfactory: boolean | null
          id: string
          inspection_date: string
          issue_chimney_flue: string | null
          issue_gas_escape: string | null
          issue_meter: string | null
          issue_other: string | null
          issue_other_description: string | null
          issue_pipework: string | null
          issue_type: string | null
          issue_ventilation: string | null
          issued_by_name: string | null
          issued_by_signature: string | null
          job_address: string | null
          job_address_name: string | null
          job_phone: string | null
          job_postcode: string | null
          next_inspection_due: string | null
          pdf_url: string | null
          permitted_pressure_drop: number | null
          pipework_visual_satisfactory: boolean | null
          purge_completed: boolean | null
          purge_detector_safe: boolean | null
          purge_electrical_bonds: boolean | null
          purge_final_o2_percent: string | null
          purge_gas_meter_volume: string | null
          purge_nitrogen_verified: boolean | null
          purge_no_smoking_signs: boolean | null
          purge_persons_advised: boolean | null
          purge_pipework_volume: string | null
          purge_result: string | null
          purge_risk_assessment: boolean | null
          purge_total_volume: string | null
          purge_two_way_radios: boolean | null
          purge_valves_labelled: boolean | null
          purge_written_procedure: string | null
          received_by_name: string | null
          received_by_signature: string | null
          riddor_11_1_status: string | null
          riddor_11_2_status: string | null
          riddor_reported_11_1: boolean | null
          riddor_reported_11_2: boolean | null
          site_id: string | null
          stabilisation_period: string | null
          status: Database["public"]["Enums"]["gas_certificate_status"]
          strength_actual_drop_mbar: number | null
          strength_calculated_drop_mbar: number | null
          strength_calculated_stp_mbar: number | null
          strength_components_isolated: boolean | null
          strength_installation_type: string | null
          strength_permitted_drop_percent: string | null
          strength_stabilisation_minutes: string | null
          strength_test_duration_minutes: string | null
          strength_test_medium: string | null
          strength_test_method: string | null
          strength_test_result: string | null
          test_duration: string | null
          test_method: string | null
          test_pressure_mbar: number | null
          tightness_actual_leak_rate: string | null
          tightness_actual_pressure_drop_mbar: number | null
          tightness_barometric_correction: boolean | null
          tightness_gas_meter_volume: string | null
          tightness_gas_type: string | null
          tightness_gauge_type: string | null
          tightness_inadequate_ventilation: boolean | null
          tightness_installation_type: string | null
          tightness_letby_period: string | null
          tightness_meter_bypass: boolean | null
          tightness_meter_model: string | null
          tightness_meter_type: string | null
          tightness_mplr_or_mapd: string | null
          tightness_pipework_volume: string | null
          tightness_stabilisation_minutes: string | null
          tightness_test_duration_minutes: string | null
          tightness_test_medium: string | null
          tightness_test_pressure_mbar: number | null
          tightness_test_result: string | null
          tightness_total_volume: string | null
          tightness_ventilation_checked: boolean | null
          tightness_weather_affect: boolean | null
          updated_at: string
          warning_location: string | null
          warning_make: string | null
          warning_model: string | null
          warning_serial_no: string | null
          warning_type: string | null
          work_purge: boolean | null
          work_strength_test: boolean | null
          work_tightness_test: boolean | null
        }
        Insert: {
          actions_required?: string | null
          actions_taken?: string | null
          actual_pressure_drop?: number | null
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["gas_certificate_type"]
          classification?:
            | Database["public"]["Enums"]["gas_warning_classification"]
            | null
          client_id?: string | null
          co_alarm_fitted?: boolean | null
          co_alarm_present?: boolean | null
          co_alarm_satisfactory?: boolean | null
          comments?: string | null
          company_id: string
          created_at?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          declaration_type?: string | null
          defects?: Json | null
          emergency_control_accessible?: boolean | null
          engineer_id: string
          equipotential_bonding?: boolean | null
          fault_details?: string | null
          gas_tightness_satisfactory?: boolean | null
          id?: string
          inspection_date?: string
          issue_chimney_flue?: string | null
          issue_gas_escape?: string | null
          issue_meter?: string | null
          issue_other?: string | null
          issue_other_description?: string | null
          issue_pipework?: string | null
          issue_type?: string | null
          issue_ventilation?: string | null
          issued_by_name?: string | null
          issued_by_signature?: string | null
          job_address?: string | null
          job_address_name?: string | null
          job_phone?: string | null
          job_postcode?: string | null
          next_inspection_due?: string | null
          pdf_url?: string | null
          permitted_pressure_drop?: number | null
          pipework_visual_satisfactory?: boolean | null
          purge_completed?: boolean | null
          purge_detector_safe?: boolean | null
          purge_electrical_bonds?: boolean | null
          purge_final_o2_percent?: string | null
          purge_gas_meter_volume?: string | null
          purge_nitrogen_verified?: boolean | null
          purge_no_smoking_signs?: boolean | null
          purge_persons_advised?: boolean | null
          purge_pipework_volume?: string | null
          purge_result?: string | null
          purge_risk_assessment?: boolean | null
          purge_total_volume?: string | null
          purge_two_way_radios?: boolean | null
          purge_valves_labelled?: boolean | null
          purge_written_procedure?: string | null
          received_by_name?: string | null
          received_by_signature?: string | null
          riddor_11_1_status?: string | null
          riddor_11_2_status?: string | null
          riddor_reported_11_1?: boolean | null
          riddor_reported_11_2?: boolean | null
          site_id?: string | null
          stabilisation_period?: string | null
          status?: Database["public"]["Enums"]["gas_certificate_status"]
          strength_actual_drop_mbar?: number | null
          strength_calculated_drop_mbar?: number | null
          strength_calculated_stp_mbar?: number | null
          strength_components_isolated?: boolean | null
          strength_installation_type?: string | null
          strength_permitted_drop_percent?: string | null
          strength_stabilisation_minutes?: string | null
          strength_test_duration_minutes?: string | null
          strength_test_medium?: string | null
          strength_test_method?: string | null
          strength_test_result?: string | null
          test_duration?: string | null
          test_method?: string | null
          test_pressure_mbar?: number | null
          tightness_actual_leak_rate?: string | null
          tightness_actual_pressure_drop_mbar?: number | null
          tightness_barometric_correction?: boolean | null
          tightness_gas_meter_volume?: string | null
          tightness_gas_type?: string | null
          tightness_gauge_type?: string | null
          tightness_inadequate_ventilation?: boolean | null
          tightness_installation_type?: string | null
          tightness_letby_period?: string | null
          tightness_meter_bypass?: boolean | null
          tightness_meter_model?: string | null
          tightness_meter_type?: string | null
          tightness_mplr_or_mapd?: string | null
          tightness_pipework_volume?: string | null
          tightness_stabilisation_minutes?: string | null
          tightness_test_duration_minutes?: string | null
          tightness_test_medium?: string | null
          tightness_test_pressure_mbar?: number | null
          tightness_test_result?: string | null
          tightness_total_volume?: string | null
          tightness_ventilation_checked?: boolean | null
          tightness_weather_affect?: boolean | null
          updated_at?: string
          warning_location?: string | null
          warning_make?: string | null
          warning_model?: string | null
          warning_serial_no?: string | null
          warning_type?: string | null
          work_purge?: boolean | null
          work_strength_test?: boolean | null
          work_tightness_test?: boolean | null
        }
        Update: {
          actions_required?: string | null
          actions_taken?: string | null
          actual_pressure_drop?: number | null
          certificate_number?: string
          certificate_type?: Database["public"]["Enums"]["gas_certificate_type"]
          classification?:
            | Database["public"]["Enums"]["gas_warning_classification"]
            | null
          client_id?: string | null
          co_alarm_fitted?: boolean | null
          co_alarm_present?: boolean | null
          co_alarm_satisfactory?: boolean | null
          comments?: string | null
          company_id?: string
          created_at?: string
          customer_address?: string | null
          customer_company?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_postcode?: string | null
          declaration_type?: string | null
          defects?: Json | null
          emergency_control_accessible?: boolean | null
          engineer_id?: string
          equipotential_bonding?: boolean | null
          fault_details?: string | null
          gas_tightness_satisfactory?: boolean | null
          id?: string
          inspection_date?: string
          issue_chimney_flue?: string | null
          issue_gas_escape?: string | null
          issue_meter?: string | null
          issue_other?: string | null
          issue_other_description?: string | null
          issue_pipework?: string | null
          issue_type?: string | null
          issue_ventilation?: string | null
          issued_by_name?: string | null
          issued_by_signature?: string | null
          job_address?: string | null
          job_address_name?: string | null
          job_phone?: string | null
          job_postcode?: string | null
          next_inspection_due?: string | null
          pdf_url?: string | null
          permitted_pressure_drop?: number | null
          pipework_visual_satisfactory?: boolean | null
          purge_completed?: boolean | null
          purge_detector_safe?: boolean | null
          purge_electrical_bonds?: boolean | null
          purge_final_o2_percent?: string | null
          purge_gas_meter_volume?: string | null
          purge_nitrogen_verified?: boolean | null
          purge_no_smoking_signs?: boolean | null
          purge_persons_advised?: boolean | null
          purge_pipework_volume?: string | null
          purge_result?: string | null
          purge_risk_assessment?: boolean | null
          purge_total_volume?: string | null
          purge_two_way_radios?: boolean | null
          purge_valves_labelled?: boolean | null
          purge_written_procedure?: string | null
          received_by_name?: string | null
          received_by_signature?: string | null
          riddor_11_1_status?: string | null
          riddor_11_2_status?: string | null
          riddor_reported_11_1?: boolean | null
          riddor_reported_11_2?: boolean | null
          site_id?: string | null
          stabilisation_period?: string | null
          status?: Database["public"]["Enums"]["gas_certificate_status"]
          strength_actual_drop_mbar?: number | null
          strength_calculated_drop_mbar?: number | null
          strength_calculated_stp_mbar?: number | null
          strength_components_isolated?: boolean | null
          strength_installation_type?: string | null
          strength_permitted_drop_percent?: string | null
          strength_stabilisation_minutes?: string | null
          strength_test_duration_minutes?: string | null
          strength_test_medium?: string | null
          strength_test_method?: string | null
          strength_test_result?: string | null
          test_duration?: string | null
          test_method?: string | null
          test_pressure_mbar?: number | null
          tightness_actual_leak_rate?: string | null
          tightness_actual_pressure_drop_mbar?: number | null
          tightness_barometric_correction?: boolean | null
          tightness_gas_meter_volume?: string | null
          tightness_gas_type?: string | null
          tightness_gauge_type?: string | null
          tightness_inadequate_ventilation?: boolean | null
          tightness_installation_type?: string | null
          tightness_letby_period?: string | null
          tightness_meter_bypass?: boolean | null
          tightness_meter_model?: string | null
          tightness_meter_type?: string | null
          tightness_mplr_or_mapd?: string | null
          tightness_pipework_volume?: string | null
          tightness_stabilisation_minutes?: string | null
          tightness_test_duration_minutes?: string | null
          tightness_test_medium?: string | null
          tightness_test_pressure_mbar?: number | null
          tightness_test_result?: string | null
          tightness_total_volume?: string | null
          tightness_ventilation_checked?: boolean | null
          tightness_weather_affect?: boolean | null
          updated_at?: string
          warning_location?: string | null
          warning_make?: string | null
          warning_model?: string | null
          warning_serial_no?: string | null
          warning_type?: string | null
          work_purge?: boolean | null
          work_strength_test?: boolean | null
          work_tightness_test?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gas_certificates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gas_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gas_certificates_site_id_fkey"
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
      leak_checks: {
        Row: {
          asset_id: string
          checked_by: string | null
          completed_date: string | null
          created_at: string
          due_date: string
          id: string
          leak_location: string | null
          leak_rate_kg_per_year: number | null
          next_check_due: string | null
          notes: string | null
          org_id: string
          repair_completed: boolean | null
          repair_date: string | null
          repair_required: boolean | null
          result: Database["public"]["Enums"]["leak_check_result"]
          site_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          checked_by?: string | null
          completed_date?: string | null
          created_at?: string
          due_date: string
          id?: string
          leak_location?: string | null
          leak_rate_kg_per_year?: number | null
          next_check_due?: string | null
          notes?: string | null
          org_id: string
          repair_completed?: boolean | null
          repair_date?: string | null
          repair_required?: boolean | null
          result?: Database["public"]["Enums"]["leak_check_result"]
          site_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          checked_by?: string | null
          completed_date?: string | null
          created_at?: string
          due_date?: string
          id?: string
          leak_location?: string | null
          leak_rate_kg_per_year?: number | null
          next_check_due?: string | null
          notes?: string | null
          org_id?: string
          repair_completed?: boolean | null
          repair_date?: string | null
          repair_required?: boolean | null
          result?: Database["public"]["Enums"]["leak_check_result"]
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leak_checks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_checks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_type_config: {
        Row: {
          avatar_required: boolean | null
          can_invite_members: boolean | null
          can_log_gas_movements: boolean | null
          can_manage_equipment: boolean | null
          can_manage_sites: boolean | null
          can_manage_stock: boolean | null
          can_perform_inspections: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          f_gas_certificate_required: boolean | null
          id: string
          onboarding_steps: Json | null
          phone_required: boolean | null
          requires_qualification_verification: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_required?: boolean | null
          can_invite_members?: boolean | null
          can_log_gas_movements?: boolean | null
          can_manage_equipment?: boolean | null
          can_manage_sites?: boolean | null
          can_manage_stock?: boolean | null
          can_perform_inspections?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name: string
          f_gas_certificate_required?: boolean | null
          id?: string
          onboarding_steps?: Json | null
          phone_required?: boolean | null
          requires_qualification_verification?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_required?: boolean | null
          can_invite_members?: boolean | null
          can_log_gas_movements?: boolean | null
          can_manage_equipment?: boolean | null
          can_manage_sites?: boolean | null
          can_manage_stock?: boolean | null
          can_perform_inspections?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          f_gas_certificate_required?: boolean | null
          id?: string
          onboarding_steps?: Json | null
          phone_required?: boolean | null
          requires_qualification_verification?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
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
          gas_safe_id_card_no: string | null
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
          gas_safe_id_card_no?: string | null
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
          gas_safe_id_card_no?: string | null
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
      qualifications: {
        Row: {
          certificate_number: string
          created_at: string
          document_url: string | null
          expires_on: string | null
          id: string
          issued_on: string
          issuing_body: string | null
          notes: string | null
          org_id: string
          qualification_type: Database["public"]["Enums"]["qualification_type"]
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_number: string
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on: string
          issuing_body?: string | null
          notes?: string | null
          org_id: string
          qualification_type: Database["public"]["Enums"]["qualification_type"]
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_number?: string
          created_at?: string
          document_url?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string
          issuing_body?: string | null
          notes?: string | null
          org_id?: string
          qualification_type?: Database["public"]["Enums"]["qualification_type"]
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      refrigerant_cylinders: {
        Row: {
          batch_number: string | null
          checked_out_at: string | null
          checked_out_to: string | null
          company_id: string
          consignment_note_id: string | null
          created_at: string
          current_weight_kg: number
          cylinder_code: string
          delivery_note_reference: string | null
          disposal_date: string | null
          disposal_method: Database["public"]["Enums"]["disposal_method"] | null
          disposal_reference: string | null
          expiry_date: string | null
          id: string
          initial_weight_kg: number
          is_recovery_cylinder: boolean | null
          notes: string | null
          purchase_date: string | null
          purchase_invoice_id: string | null
          purchase_order_number: string | null
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          status: Database["public"]["Enums"]["cylinder_status"]
          supplier: string | null
          supplier_id: string | null
          tare_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          checked_out_at?: string | null
          checked_out_to?: string | null
          company_id: string
          consignment_note_id?: string | null
          created_at?: string
          current_weight_kg: number
          cylinder_code: string
          delivery_note_reference?: string | null
          disposal_date?: string | null
          disposal_method?:
            | Database["public"]["Enums"]["disposal_method"]
            | null
          disposal_reference?: string | null
          expiry_date?: string | null
          id?: string
          initial_weight_kg: number
          is_recovery_cylinder?: boolean | null
          notes?: string | null
          purchase_date?: string | null
          purchase_invoice_id?: string | null
          purchase_order_number?: string | null
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          status?: Database["public"]["Enums"]["cylinder_status"]
          supplier?: string | null
          supplier_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          checked_out_at?: string | null
          checked_out_to?: string | null
          company_id?: string
          consignment_note_id?: string | null
          created_at?: string
          current_weight_kg?: number
          cylinder_code?: string
          delivery_note_reference?: string | null
          disposal_date?: string | null
          disposal_method?:
            | Database["public"]["Enums"]["disposal_method"]
            | null
          disposal_reference?: string | null
          expiry_date?: string | null
          id?: string
          initial_weight_kg?: number
          is_recovery_cylinder?: boolean | null
          notes?: string | null
          purchase_date?: string | null
          purchase_invoice_id?: string | null
          purchase_order_number?: string | null
          refrigerant_type?: Database["public"]["Enums"]["refrigerant_type"]
          status?: Database["public"]["Enums"]["cylinder_status"]
          supplier?: string | null
          supplier_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refrigerant_cylinders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_cylinders_consignment_note_id_fkey"
            columns: ["consignment_note_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_cylinders_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_cylinders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refrigerant_movements: {
        Row: {
          company_id: string
          created_at: string
          cylinder_id: string | null
          cylinder_reference: string | null
          engineer_id: string
          engineer_name: string
          equipment_id: string | null
          id: string
          issued_by_user_id: string | null
          issued_to_engineer_id: string | null
          job_reference: string | null
          movement_date: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          reason: Database["public"]["Enums"]["movement_reason"] | null
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          site_id: string | null
          source: string | null
          updated_at: string
          waste_transfer_note_id: string | null
          weight_kg: number
        }
        Insert: {
          company_id: string
          created_at?: string
          cylinder_id?: string | null
          cylinder_reference?: string | null
          engineer_id: string
          engineer_name: string
          equipment_id?: string | null
          id?: string
          issued_by_user_id?: string | null
          issued_to_engineer_id?: string | null
          job_reference?: string | null
          movement_date?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          reason?: Database["public"]["Enums"]["movement_reason"] | null
          refrigerant_type: Database["public"]["Enums"]["refrigerant_type"]
          site_id?: string | null
          source?: string | null
          updated_at?: string
          waste_transfer_note_id?: string | null
          weight_kg: number
        }
        Update: {
          company_id?: string
          created_at?: string
          cylinder_id?: string | null
          cylinder_reference?: string | null
          engineer_id?: string
          engineer_name?: string
          equipment_id?: string | null
          id?: string
          issued_by_user_id?: string | null
          issued_to_engineer_id?: string | null
          job_reference?: string | null
          movement_date?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          reason?: Database["public"]["Enums"]["movement_reason"] | null
          refrigerant_type?: Database["public"]["Enums"]["refrigerant_type"]
          site_id?: string | null
          source?: string | null
          updated_at?: string
          waste_transfer_note_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "refrigerant_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_movements_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "refrigerant_cylinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_movements_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refrigerant_movements_waste_transfer_note_id_fkey"
            columns: ["waste_transfer_note_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string
          city: string | null
          client_id: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean | null
          name: string
          notes: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          client_id?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          client_id?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          address: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
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
          token: string | null
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
          token?: string | null
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
          token?: string | null
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
      create_company_for_current_user: {
        Args: {
          company_address?: string
          company_email?: string
          company_name: string
          company_phone?: string
        }
        Returns: string
      }
      generate_unique_slug: { Args: { company_name: string }; Returns: string }
      get_company_license_count: {
        Args: { company_uuid: string }
        Returns: number
      }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_profile_config_for_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          avatar_required: boolean | null
          can_invite_members: boolean | null
          can_log_gas_movements: boolean | null
          can_manage_equipment: boolean | null
          can_manage_sites: boolean | null
          can_manage_stock: boolean | null
          can_perform_inspections: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          f_gas_certificate_required: boolean | null
          id: string
          onboarding_steps: Json | null
          phone_required: boolean | null
          requires_qualification_verification: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profile_type_config"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_required_inspection_frequency: {
        Args: { co2e_tonnes: number }
        Returns: number
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_profile_status: { Args: { _user_id: string }; Returns: Json }
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
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: Database["public"]["Enums"]["audit_action"]
          _metadata?: Json
          _org_id: string
          _target_id?: string
          _target_table: string
        }
        Returns: string
      }
      user_can_create_company: { Args: { _user_id: string }; Returns: boolean }
      validate_profile_for_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      addon_type: "natural_gas"
      app_role:
        | "owner"
        | "manager"
        | "engineer"
        | "admin"
        | "auditor"
        | "read_only"
        | "stores_manager"
      audit_action:
        | "membership_created"
        | "membership_updated"
        | "membership_deleted"
        | "role_changed"
        | "equipment_deleted"
        | "site_deleted"
        | "document_deleted"
        | "export_generated"
        | "settings_updated"
      company_certificate_type: "refcom" | "quidos" | "fgas_company" | "other"
      cylinder_status: "in_stock" | "checked_out" | "empty" | "disposed"
      disposal_method:
        | "returned_to_supplier"
        | "sent_for_destruction"
        | "reclaimed"
      document_type:
        | "certificate"
        | "invoice"
        | "photo"
        | "declaration"
        | "label"
        | "report"
        | "other"
        | "waste_transfer_note"
        | "consignment_note"
        | "purchase_invoice"
      gas_certificate_status: "draft" | "issued"
      gas_certificate_type:
        | "landlord_gas_safety"
        | "homeowner_gas_safety"
        | "nd_gas_safety"
        | "nd_gas_testing_purging"
        | "gas_warning_notice"
      gas_warning_classification:
        | "immediately_dangerous"
        | "at_risk"
        | "not_to_current_standards"
      inspection_result: "pass" | "pass_with_observations" | "fail" | "deferred"
      leak_check_result:
        | "pass"
        | "fail_leak_found"
        | "fail_inaccessible"
        | "pending"
        | "overdue"
      movement_reason:
        | "commissioning"
        | "leak_repair"
        | "top_up"
        | "recovery"
        | "disposal"
        | "transfer"
      movement_type: "book_out" | "book_in" | "recovered"
      qualification_type:
        | "f_gas_category_1"
        | "f_gas_category_2"
        | "f_gas_category_3"
        | "f_gas_category_4"
        | "acs"
        | "city_guilds"
        | "nvq"
        | "other"
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
      addon_type: ["natural_gas"],
      app_role: [
        "owner",
        "manager",
        "engineer",
        "admin",
        "auditor",
        "read_only",
        "stores_manager",
      ],
      audit_action: [
        "membership_created",
        "membership_updated",
        "membership_deleted",
        "role_changed",
        "equipment_deleted",
        "site_deleted",
        "document_deleted",
        "export_generated",
        "settings_updated",
      ],
      company_certificate_type: ["refcom", "quidos", "fgas_company", "other"],
      cylinder_status: ["in_stock", "checked_out", "empty", "disposed"],
      disposal_method: [
        "returned_to_supplier",
        "sent_for_destruction",
        "reclaimed",
      ],
      document_type: [
        "certificate",
        "invoice",
        "photo",
        "declaration",
        "label",
        "report",
        "other",
        "waste_transfer_note",
        "consignment_note",
        "purchase_invoice",
      ],
      gas_certificate_status: ["draft", "issued"],
      gas_certificate_type: [
        "landlord_gas_safety",
        "homeowner_gas_safety",
        "nd_gas_safety",
        "nd_gas_testing_purging",
        "gas_warning_notice",
      ],
      gas_warning_classification: [
        "immediately_dangerous",
        "at_risk",
        "not_to_current_standards",
      ],
      inspection_result: ["pass", "pass_with_observations", "fail", "deferred"],
      leak_check_result: [
        "pass",
        "fail_leak_found",
        "fail_inaccessible",
        "pending",
        "overdue",
      ],
      movement_reason: [
        "commissioning",
        "leak_repair",
        "top_up",
        "recovery",
        "disposal",
        "transfer",
      ],
      movement_type: ["book_out", "book_in", "recovered"],
      qualification_type: [
        "f_gas_category_1",
        "f_gas_category_2",
        "f_gas_category_3",
        "f_gas_category_4",
        "acs",
        "city_guilds",
        "nvq",
        "other",
      ],
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
