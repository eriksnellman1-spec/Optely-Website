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
          call_attempt: number
          city: string | null
          created_at: string
          do_not_contact: boolean
          domain: string | null
          employees: number | null
          enrichment: Json
          id: string
          industry: string | null
          last_activity_at: string | null
          last_call_at: string | null
          name: string
          notes: string | null
          nurture_until: string | null
          offer: Database["public"]["Enums"]["offer"]
          partner_id: string | null
          phone: string | null
          released_at: string | null
          revenue_eur: number | null
          sequence_contact_id: string | null
          sequence_round: number
          sequence_started_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          business_id?: string | null
          call_attempt?: number
          city?: string | null
          created_at?: string
          do_not_contact?: boolean
          domain?: string | null
          employees?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          last_call_at?: string | null
          name: string
          notes?: string | null
          nurture_until?: string | null
          offer?: Database["public"]["Enums"]["offer"]
          partner_id?: string | null
          phone?: string | null
          released_at?: string | null
          revenue_eur?: number | null
          sequence_contact_id?: string | null
          sequence_round?: number
          sequence_started_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_id?: string | null
          call_attempt?: number
          city?: string | null
          created_at?: string
          do_not_contact?: boolean
          domain?: string | null
          employees?: number | null
          enrichment?: Json
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          last_call_at?: string | null
          name?: string
          notes?: string | null
          nurture_until?: string | null
          offer?: Database["public"]["Enums"]["offer"]
          partner_id?: string | null
          phone?: string | null
          released_at?: string | null
          revenue_eur?: number | null
          sequence_contact_id?: string | null
          sequence_round?: number
          sequence_started_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_sequence_contact_id_fkey"
            columns: ["sequence_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
          offer: Database["public"]["Enums"]["offer"] | null
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
          offer?: Database["public"]["Enums"]["offer"] | null
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
          offer?: Database["public"]["Enums"]["offer"] | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers_optely: {
        Row: {
          company_id: string
          created_at: string
          invoice_note: string | null
          invoiced: boolean
          maintenance_agreement: boolean
          project: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          invoice_note?: string | null
          invoiced?: boolean
          maintenance_agreement?: boolean
          project?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          invoice_note?: string | null
          invoiced?: boolean
          maintenance_agreement?: boolean
          project?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_optely_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          id: string
          next_action: string | null
          next_action_at: string | null
          offer: Database["public"]["Enums"]["offer"]
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at: string
          updated_at: string
          value_eur: number | null
          won_at: string | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          offer: Database["public"]["Enums"]["offer"]
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          updated_at?: string
          value_eur?: number | null
          won_at?: string | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          offer?: Database["public"]["Enums"]["offer"]
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          updated_at?: string
          value_eur?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          sequence_round: number
          sequence_step: number
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string | null
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
          sequence_round?: number
          sequence_step?: number
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template?: string | null
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
          sequence_round?: number
          sequence_step?: number
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template?: string | null
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
      linkedin_messages: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          note: string | null
          sent_at: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          note?: string | null
          sent_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          note?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          calendar_added_at: string | null
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
          calendar_added_at?: string | null
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
          calendar_added_at?: string | null
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
      sba_clients: {
        Row: {
          bookings: number
          company_id: string
          created_at: string
          guarantee_met: boolean | null
          id: string
          invoice: boolean | null
          month: string
          updated_at: string
        }
        Insert: {
          bookings?: number
          company_id: string
          created_at?: string
          guarantee_met?: boolean | null
          id?: string
          invoice?: boolean | null
          month: string
          updated_at?: string
        }
        Update: {
          bookings?: number
          company_id?: string
          created_at?: string
          guarantee_met?: boolean | null
          id?: string
          invoice?: boolean | null
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      sms_messages: {
        Row: {
          body: string
          company_id: string
          contact_id: string | null
          created_at: string
          due_at: string
          id: string
          sent_at: string | null
          status: string
          template: string | null
          to_phone: string
        }
        Insert: {
          body: string
          company_id: string
          contact_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          template?: string | null
          to_phone: string
        }
        Update: {
          body?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          template?: string | null
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          attempt: number | null
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
          attempt?: number | null
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
          attempt?: number | null
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
            isOneToOne: true
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
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          notes: string
          offer: Database["public"]["Enums"]["offer"] | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          offer?: Database["public"]["Enums"]["offer"] | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          offer?: Database["public"]["Enums"]["offer"] | null
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      activities: {
        Row: {
          channel: string | null
          company_id: string | null
          contact_id: string | null
          duration_seconds: number | null
          note: string | null
          occurred_at: string | null
          offer: Database["public"]["Enums"]["offer"] | null
          outcome: string | null
          partner_id: string | null
          source: string | null
          source_id: string | null
          type: string | null
        }
        Relationships: []
      }
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
          offer: Database["public"]["Enums"]["offer"] | null
          open_task_count: number | null
          partner_id: string | null
          status: Database["public"]["Enums"]["company_status"] | null
          website: string | null
        }
        Relationships: []
      }
      email_overview: {
        Row: {
          ai_opening_line: string | null
          company_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string | null
          offer: Database["public"]["Enums"]["offer"] | null
          queued_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"] | null
          subject: string | null
          template: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          city: string | null
          classification: string | null
          company_id: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          kind: string | null
          offer: Database["public"]["Enums"]["offer"] | null
          partner_name: string | null
          phone: string | null
          received_at: string | null
          reply_body: string | null
          task_id: string | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          title: string | null
        }
        Relationships: []
      }
      offer_stats_weekly: {
        Row: {
          booked_per_100: number | null
          channel: string | null
          contacted: number | null
          deals_won: number | null
          meetings_booked: number | null
          offer: Database["public"]["Enums"]["offer"] | null
          replies: number | null
          week_start: string | null
        }
        Relationships: []
      }
      partners_due: {
        Row: {
          checkin_interval_days: number | null
          city: string | null
          contact_name: string | null
          days_since: number | null
          email: string | null
          id: string | null
          last_checkin_at: string | null
          name: string | null
          phone: string | null
          type: Database["public"]["Enums"]["partner_type"] | null
        }
        Relationships: []
      }
      pipeline_cards: {
        Row: {
          city: string | null
          company_id: string | null
          company_name: string | null
          company_status: Database["public"]["Enums"]["company_status"] | null
          deal_id: string | null
          industry: string | null
          next_action: string | null
          next_action_at: string | null
          offer: Database["public"]["Enums"]["offer"] | null
          stage: Database["public"]["Enums"]["deal_stage"] | null
          stage_changed_at: string | null
          value_eur: number | null
          won_at: string | null
        }
        Relationships: []
      }
      ringpass_queue: {
        Row: {
          attempt: number | null
          call_attempt: number | null
          city: string | null
          company_id: string | null
          company_name: string | null
          company_notes: string | null
          company_status: Database["public"]["Enums"]["company_status"] | null
          contact_id: string | null
          description: string | null
          due_at: string | null
          email: string | null
          employees: number | null
          first_name: string | null
          industry: string | null
          last_name: string | null
          offer: Database["public"]["Enums"]["offer"] | null
          partner_name: string | null
          phone: string | null
          previous_calls: number | null
          priority: number | null
          reply_id: string | null
          role: string | null
          task_id: string | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          title: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_call_outcome: {
        Args: { p_task_id: string; p_outcome: string; p_notes?: string; p_voicemail?: boolean; p_payload?: Json }
        Returns: Json
      }
      attributed_channel: {
        Args: { p_company_id: string; p_at: string }
        Returns: string
      }
      create_template_email: {
        Args: { p_company_id: string; p_contact_id: string; p_template: string; p_step: number; p_round: number; p_vars?: Json; p_status?: Database["public"]["Enums"]["email_status"] }
        Returns: string
      }
      fill_template: {
        Args: { p_text: string; p_contact_id: string; p_company_id: string; p_vars?: Json }
        Returns: string
      }
      find_company_duplicates: {
        Args: { p_name: string; p_website?: string; p_email?: string; p_phone?: string }
        Returns: { company_id: string | null; name: string | null; status: Database["public"]["Enums"]["company_status"] | null; matched_on: string | null }[]
      }
      helsinki_at: {
        Args: { p_day: string; p_time: string }
        Returns: string
      }
      helsinki_today: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      move_deal_stage: {
        Args: { p_company_id: string; p_stage: Database["public"]["Enums"]["deal_stage"] }
        Returns: undefined
      }
      next_call_slot: {
        Args: { p_after?: string }
        Returns: string
      }
      next_channel_date: {
        Args: { p_channel: string; p_after?: string }
        Returns: string
      }
      norm_company_name: {
        Args: { p: string }
        Returns: string
      }
      norm_domain: {
        Args: { p: string }
        Returns: string
      }
      norm_phone: {
        Args: { p: string }
        Returns: string
      }
      queue_template_sms: {
        Args: { p_company_id: string; p_contact_id: string; p_template: string; p_due: string; p_vars?: Json }
        Returns: string
      }
      release_new_calls: {
        Args: { p_count?: number }
        Returns: number
      }
      ringpass_setting: {
        Args: { p_key: string }
        Returns: string
      }
      run_daily_sequence: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      schedule_call: {
        Args: { p_company_id: string; p_contact_id: string; p_due: string; p_title: string; p_attempt?: number; p_priority?: number; p_description?: string }
        Returns: string
      }
      stage_for_status: {
        Args: { p_status: Database["public"]["Enums"]["company_status"] }
        Returns: Database["public"]["Enums"]["deal_stage"]
      }
      stop_all_channels: {
        Args: { p_company_id: string; p_keep_task?: string }
        Returns: undefined
      }
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
        | "send_info"
        | "not_now"
        | "no_need"
        | "do_not_call"
      campaign_status:
        | "draft"
        | "active"
        | "paused"
        | "completed"
      company_status:
        | "new"
        | "in_sequence"
        | "replied"
        | "meeting_booked"
        | "meeting_done"
        | "solution_shown"
        | "quote_sent"
        | "customer"
        | "nurture"
        | "no"
        | "do_not_contact"
        | "with_partner"
      context_kind:
        | "profile"
        | "offer"
        | "icp"
        | "case"
        | "script"
        | "objection"
        | "sequence"
        | "tone"
        | "template"
        | "other"
      deal_stage:
        | "kontaktad"
        | "svar"
        | "mote_bokat"
        | "mote_hallet"
        | "offert"
        | "kund"
        | "forlorad"
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
      message_direction:
        | "out"
        | "in"
      offer:
        | "optely"
        | "sba"
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
        | "linkedin"
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
      call_outcome: ["no_answer", "voicemail", "callback", "interested", "not_interested", "meeting_booked", "wrong_person", "send_info", "not_now", "no_need", "do_not_call"],
      campaign_status: ["draft", "active", "paused", "completed"],
      company_status: ["new", "in_sequence", "replied", "meeting_booked", "meeting_done", "solution_shown", "quote_sent", "customer", "nurture", "no", "do_not_contact", "with_partner"],
      context_kind: ["profile", "offer", "icp", "case", "script", "objection", "sequence", "tone", "template", "other"],
      deal_stage: ["kontaktad", "svar", "mote_bokat", "mote_hallet", "offert", "kund", "forlorad"],
      email_status: ["draft", "pending_review", "approved", "rejected", "queued", "sent", "bounced", "replied", "failed"],
      meeting_status: ["scheduled", "held", "no_show", "cancelled"],
      message_direction: ["out", "in"],
      offer: ["optely", "sba"],
      partner_type: ["it", "accounting", "web", "marketing", "other"],
      reply_classification: ["positive", "neutral", "negative", "out_of_office", "unsubscribe", "unclassified"],
      task_status: ["open", "done", "skipped"],
      task_type: ["call", "follow_up", "partner_checkin", "linkedin", "other"],
    },
  },
} as const
