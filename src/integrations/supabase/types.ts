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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          project_id: string | null
        }
        Insert: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          number: number
          project_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          number?: number
          project_id: string
          text?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          number?: number
          project_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      forum1_checks: {
        Row: {
          created_at: string
          id: string
          item_index: number
          name: string
          note: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_index?: number
          name?: string
          note?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_index?: number
          name?: string
          note?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum1_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      forum2_reviews: {
        Row: {
          created_at: string
          id: string
          note: string
          project_id: string
          reviewer_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          project_id: string
          reviewer_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          project_id?: string
          reviewer_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum2_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          date: string | null
          forum_type: string
          forum3_summary: Json | null
          id: string
          location: string | null
          number: number | null
          project_id: string
          raw_notes: string
          status: string
          summary: string
          time: string | null
          time_end: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          forum_type?: string
          forum3_summary?: Json | null
          id?: string
          location?: string | null
          number?: number | null
          project_id: string
          raw_notes?: string
          status?: string
          summary?: string
          time?: string | null
          time_end?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          forum_type?: string
          forum3_summary?: Json | null
          id?: string
          location?: string | null
          number?: number | null
          project_id?: string
          raw_notes?: string
          status?: string
          summary?: string
          time?: string | null
          time_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_addresses: {
        Row: {
          building_numbers: string[] | null
          created_at: string
          id: string
          notes: string | null
          project_id: string
          street_name: string
        }
        Insert: {
          building_numbers?: string[] | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          street_name: string
        }
        Update: {
          building_numbers?: string[] | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          street_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_addresses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assets: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          file_path: string
          id: string
          project_id: string
          slide_number: number | null
          source: string | null
        }
        Insert: {
          asset_type?: string
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          project_id: string
          slide_number?: number | null
          source?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          project_id?: string
          slide_number?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stage_dates: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          id: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          project_id: string
          stage_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id: string
          stage_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          project_id?: string
          stage_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stage_dates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address_cluster_summary: string | null
          authority: string | null
          created_at: string
          developer: string | null
          id: string
          iplan_object_id: number | null
          last_update: string | null
          main_blocker: string | null
          main_stage: string | null
          management_status: string | null
          multiplier: number | null
          next_action: string | null
          next_action_due_date: string | null
          next_action_owner: string | null
          notes: string | null
          order_index: number | null
          pinned: boolean | null
          plan_number: string | null
          plan_submitter: string | null
          project_name: string
          quarter: string | null
          risk_level: string | null
          source_addresses_text: string | null
          sub_stage: string | null
          units_in: number | null
          units_out: number | null
          updated_at: string
        }
        Insert: {
          address_cluster_summary?: string | null
          authority?: string | null
          created_at?: string
          developer?: string | null
          id?: string
          iplan_object_id?: number | null
          last_update?: string | null
          main_blocker?: string | null
          main_stage?: string | null
          management_status?: string | null
          multiplier?: number | null
          next_action?: string | null
          next_action_due_date?: string | null
          next_action_owner?: string | null
          notes?: string | null
          order_index?: number | null
          pinned?: boolean | null
          plan_number?: string | null
          plan_submitter?: string | null
          project_name: string
          quarter?: string | null
          risk_level?: string | null
          source_addresses_text?: string | null
          sub_stage?: string | null
          units_in?: number | null
          units_out?: number | null
          updated_at?: string
        }
        Update: {
          address_cluster_summary?: string | null
          authority?: string | null
          created_at?: string
          developer?: string | null
          id?: string
          iplan_object_id?: number | null
          last_update?: string | null
          main_blocker?: string | null
          main_stage?: string | null
          management_status?: string | null
          multiplier?: number | null
          next_action?: string | null
          next_action_due_date?: string | null
          next_action_owner?: string | null
          notes?: string | null
          order_index?: number | null
          pinned?: boolean | null
          plan_number?: string | null
          plan_submitter?: string | null
          project_name?: string
          quarter?: string | null
          risk_level?: string | null
          source_addresses_text?: string | null
          sub_stage?: string | null
          units_in?: number | null
          units_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tama_sites: {
        Row: {
          building_number: string | null
          building_type: string | null
          construction_status: string | null
          contact_person: string | null
          cranes_count: string | null
          cranes_text: string | null
          created_at: string
          id: string
          is_anomaly: boolean
          notes: string | null
          permit_description: string | null
          permit_validity: string | null
          phone: string | null
          quarter: string | null
          request_number: string | null
          review_note: string
          review_status: string
          site_address: string
          source_row_index: number | null
          updated_at: string
          yuval_notes: string | null
        }
        Insert: {
          building_number?: string | null
          building_type?: string | null
          construction_status?: string | null
          contact_person?: string | null
          cranes_count?: string | null
          cranes_text?: string | null
          created_at?: string
          id?: string
          is_anomaly?: boolean
          notes?: string | null
          permit_description?: string | null
          permit_validity?: string | null
          phone?: string | null
          quarter?: string | null
          request_number?: string | null
          review_note?: string
          review_status?: string
          site_address?: string
          source_row_index?: number | null
          updated_at?: string
          yuval_notes?: string | null
        }
        Update: {
          building_number?: string | null
          building_type?: string | null
          construction_status?: string | null
          contact_person?: string | null
          cranes_count?: string | null
          cranes_text?: string | null
          created_at?: string
          id?: string
          is_anomaly?: boolean
          notes?: string | null
          permit_description?: string | null
          permit_validity?: string | null
          phone?: string | null
          quarter?: string | null
          request_number?: string | null
          review_note?: string
          review_status?: string
          site_address?: string
          source_row_index?: number | null
          updated_at?: string
          yuval_notes?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          blocker: string
          created_at: string
          deadline: string | null
          decision_id: string | null
          id: string
          meeting_id: string | null
          notes: string
          owner: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          blocker?: string
          created_at?: string
          deadline?: string | null
          decision_id?: string | null
          id?: string
          meeting_id?: string | null
          notes?: string
          owner?: string
          priority?: string
          project_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          blocker?: string
          created_at?: string
          deadline?: string | null
          decision_id?: string | null
          id?: string
          meeting_id?: string | null
          notes?: string
          owner?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
