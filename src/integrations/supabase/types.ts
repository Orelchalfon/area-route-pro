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
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          filter_replacement_month: number | null
          id: string
          import_key: string | null
          lat: number | null
          lng: number | null
          name: string
          next_service_date: string | null
          notes: string | null
          phone: string | null
          place_id: string | null
          product: string | null
          service_track: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          filter_replacement_month?: number | null
          id?: string
          import_key?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          product?: string | null
          service_track?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          filter_replacement_month?: number | null
          id?: string
          import_key?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          product?: string | null
          service_track?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      installations: {
        Row: {
          address: string | null
          city: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_status: string | null
          created_at: string
          customer_name: string | null
          estimated_duration: number | null
          id: string
          installation_date: string | null
          installation_time: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          product_type: string | null
          region: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          sheet_row_id: string | null
          source: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_name?: string | null
          estimated_duration?: number | null
          id?: string
          installation_date?: string | null
          installation_time?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          product_type?: string | null
          region?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sheet_row_id?: string | null
          source?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_name?: string | null
          estimated_duration?: number | null
          id?: string
          installation_date?: string | null
          installation_time?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          product_type?: string | null
          region?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sheet_row_id?: string | null
          source?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      malfunctions: {
        Row: {
          address: string | null
          city: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_status: string | null
          created_at: string
          customer_name: string | null
          description: string | null
          estimated_duration: number | null
          id: string
          malfunction_date: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          region: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          sheet_row_id: string | null
          source: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          malfunction_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          region?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sheet_row_id?: string | null
          source?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_name?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          malfunction_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          region?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sheet_row_id?: string | null
          source?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ongoing_services: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_status: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          estimated_duration: number | null
          id: string
          is_done: boolean | null
          location: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_date: string
          source: string | null
          status: string | null
          status_label: string | null
          status_synced_at: string | null
          task_description: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          estimated_duration?: number | null
          id?: string
          is_done?: boolean | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_date: string
          source?: string | null
          status?: string | null
          status_label?: string | null
          status_synced_at?: string | null
          task_description: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          estimated_duration?: number | null
          id?: string
          is_done?: boolean | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_date?: string
          source?: string | null
          status?: string | null
          status_label?: string | null
          status_synced_at?: string | null
          task_description?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      approved_schedule_days: {
        Row: {
          approved_at: string
          id: string
          service_date: string
          technician_id: string
        }
        Insert: {
          approved_at?: string
          id?: string
          service_date: string
          technician_id: string
        }
        Update: {
          approved_at?: string
          id?: string
          service_date?: string
          technician_id?: string
        }
        Relationships: []
      }
      scheduled_filter_services: {
        Row: {
          city: string | null
          completion_notes: string | null
          completion_status: string | null
          created_at: string
          customer_id: string
          estimated_duration: number | null
          id: string
          job_key: string
          location: string | null
          notes: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_id: string
          estimated_duration?: number | null
          id?: string
          job_key: string
          location?: string | null
          notes?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string
          customer_id?: string
          estimated_duration?: number | null
          id?: string
          job_key?: string
          location?: string | null
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_technician_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
