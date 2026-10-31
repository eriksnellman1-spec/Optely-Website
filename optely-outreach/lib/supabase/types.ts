export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calls: {
        Row: {
          called_at: string
          company_id: string
          contact_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          task_id: string | null
        }
        Insert: {
          called_at?: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          task_id?: string | null
        }
        Update: {
          called_at?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          daily_limit: number
          description: string | null
          external_id: string | null
          id: string
          name: string
          provider: string
          starts_on: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          description?: string | null
          external_id?: string | null
          id?: string
          name: string
          provider?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          description?: string | null
          external_id?: string | null
          id?: string
          name?: string
          provider?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          business_id: string | null
          city: string | null
          created_at: string
          do_not_contact: boolean
          employees: number | null
          enrichment: Json
          id: string
          industry: string | null
          last_activity_at: string | null
          name: string
          notes: string | null
          revenue_eur: number | null
          source: string | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          business_id?: string | null
          city?: string | null
          created_at?: string
          do_not_contact?: boolean
          employees?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name: string
          notes?: string | null
          revenue_eur?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_id?: string | null
          city?: string | null
          created_at?: string
          do_not_contact?: boolean
          employees?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name?: string
          notes?: string | null
          revenue_eur?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string
          do_not_contact: boolean
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          last_name: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      context_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["context_kind"]
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["context_kind"]
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["context_kind"]
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          ai_model: string | null
          ai_opening_line: string | null
          body: string
          campaign_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          queued_at: string | null
          reviewed_at: string | null
          sent_at: string | null
          sequence_step: number
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_opening_line?: string | null
          body: string
          campaign_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          queued_at?: string | null
          reviewed_at?: string | null
          sent_at?: string | null
          sequence_step?: number
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_opening_line?: string | null
          body?: string
          campaign_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          queued_at?: string | null
          reviewed_at?: string | null
          sent_at?: string | null
          sequence_step?: number
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          calendar_event_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          outcome: string | null
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
          value_eur: number | null
        }
        Insert: {
          calendar_event_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at?: string
          value_eur?: number | null
        }
        Update: {
          calendar_event_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
          value_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          id: string
          notes: string | null
          partner_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_checkins_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          checkin_interval_days: number
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          last_checkin_at: string | null
          name: string
          notes: string | null
          phone: string | null
          referrals_count: number
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string
        }
        Insert: {
          checkin_interval_days?: number
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_checkin_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          referrals_count?: number
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Update: {
          checkin_interval_days?: number
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_checkin_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          referrals_count?: number
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      replies: {
        Row: {
          ai_summary: string | null
          body: string
          classification: Database["public"]["Enums"]["reply_classification"]
          company_id: string
          contact_id: string | null
          created_at: string
          email_id: string | null
          from_address: string | null
          id: string
          received_at: string
          subject: string | null
        }
        Insert: {
          ai_summary?: string | null
          body: string
          classification?: Database["public"]["Enums"]["reply_classification"]
          company_id: string
          contact_id?: string | null
          created_at?: string
          email_id?: string | null
          from_address?: string | null
          id?: string
          received_at?: string
          subject?: string | null
        }
        Update: {
          ai_summary?: string | null
          body?: string
          classification?: Database["public"]["Enums"]["reply_classification"]
          company_id?: string
          contact_id?: string | null
          created_at?: string
          email_id?: string | null
          from_address?: string | null
          id?: string
          received_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_at: string
          id: string
          partner_id: string | null
          priority: number
          reply_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          id?: string
          partner_id?: string | null
          priority?: number
          reply_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          id?: string
          partner_id?: string | null
          priority?: number
          reply_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: true
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          source: string
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          source?: string
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_overview: {
        Row: {
          city: string | null
          contact_count: number | null
          created_at: string | null
          do_not_contact: boolean | null
          employees: number | null
          id: string | null
          industry: string | null
          last_activity_at: string | null
          name: string | null
          open_task_count: number | null
          status: Database["public"]["Enums"]["company_status"] | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      call_outcome:
        | "no_answer"
        | "voicemail"
        | "callback"
        | "interested"
        | "not_interested"
        | "meeting_booked"
        | "wrong_person"
      campaign_status:
        | "draft"
        | "active"
        | "paused"
        | "completed"
      company_status:
        | "new"
        | "researching"
        | "contacted"
        | "replied"
        | "warm"
        | "meeting_booked"
        | "customer"
        | "lost"
      context_kind:
        | "profile"
        | "offer"
        | "icp"
        | "case"
        | "script"
        | "objection"
        | "tone"
        | "other"
      email_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "queued"
        | "sent"
        | "bounced"
        | "replied"
        | "failed"
      meeting_status:
        | "scheduled"
        | "held"
        | "no_show"
        | "cancelled"
      partner_type:
        | "it"
        | "accounting"
        | "web"
        | "marketing"
        | "other"
      reply_classification:
        | "positive"
        | "neutral"
        | "negative"
        | "out_of_office"
        | "unsubscribe"
        | "unclassified"
      task_status:
        | "open"
        | "done"
        | "skipped"
      task_type:
        | "call"
        | "follow_up"
        | "partner_checkin"
        | "other"
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

export const Constants = {
  public: {
    Enums: {
      call_outcome: ["no_answer", "voicemail", "callback", "interested", "not_interested", "meeting_booked", "wrong_person"],
      campaign_status: ["draft", "active", "paused", "completed"],
      company_status: ["new", "researching", "contacted", "replied", "warm", "meeting_booked", "customer", "lost"],
      context_kind: ["profile", "offer", "icp", "case", "script", "objection", "tone", "other"],
      email_status: ["draft", "pending_review", "approved", "rejected", "queued", "sent", "bounced", "replied", "failed"],
      meeting_status: ["scheduled", "held", "no_show", "cancelled"],
      partner_type: ["it", "accounting", "web", "marketing", "other"],
      reply_classification: ["positive", "neutral", "negative", "out_of_office", "unsubscribe", "unclassified"],
      task_status: ["open", "done", "skipped"],
      task_type: ["call", "follow_up", "partner_checkin", "other"],
    },
  },
} as const
