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
      academy_applications: {
        Row: {
          id: string
          full_name: string
          email: string
          whatsapp_number: string
          address: string
          amount: number
          payment_status: string
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          whatsapp_number: string
          address: string
          amount?: number
          payment_status?: string
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          whatsapp_number?: string
          address?: string
          amount?: number
          payment_status?: string
          reference?: string | null
          created_at?: string
        }
        Relationships: []
      }
      beat_likes: {
        Row: {
          beat_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          beat_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          beat_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_likes_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_plays_log: {
        Row: {
          beat_id: string
          id: string
          played_at: string
        }
        Insert: {
          beat_id: string
          id?: string
          played_at?: string
        }
        Update: {
          beat_id?: string
          id?: string
          played_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_plays_log_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          audio_url: string | null
          bpm: number
          cover_url: string | null
          created_at: string
          description: string | null
          duration: number
          genre: string
          id: string
          key: string
          licenses: Json
          mood: string | null
          plays: number
          producer_id: string
          published: boolean
          stems_url: string | null
          tags: string[]
          title: string
          updated_at: string
          wav_url: string | null
        }
        Insert: {
          audio_url?: string | null
          bpm?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          genre: string
          id?: string
          key?: string
          licenses: Json
          mood?: string | null
          plays?: number
          producer_id: string
          published?: boolean
          stems_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          wav_url?: string | null
        }
        Update: {
          audio_url?: string | null
          bpm?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          genre?: string
          id?: string
          key?: string
          licenses?: Json
          mood?: string | null
          plays?: number
          producer_id?: string
          published?: boolean
          stems_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          wav_url?: string | null
        }
        Relationships: []
      }
      negotiation_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          negotiation_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          negotiation_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          negotiation_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          artist_email: string
          artist_id: string
          artist_name: string
          beat_id: string
          beat_title: string
          created_at: string
          id: string
          license_name: string
          offer_amount: number
          producer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_email?: string
          artist_id: string
          artist_name?: string
          beat_id: string
          beat_title: string
          created_at?: string
          id?: string
          license_name: string
          offer_amount: number
          producer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_email?: string
          artist_id?: string
          artist_name?: string
          beat_id?: string
          beat_title?: string
          created_at?: string
          id?: string
          license_name?: string
          offer_amount?: number
          producer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          beat_id: string
          buyer_id: string
          contract_snapshot: string
          created_at: string
          id: string
          license_name: string
          license_type: string
          price: number
          producer_id: string
          status: string
        }
        Insert: {
          beat_id: string
          buyer_id: string
          contract_snapshot: string
          created_at?: string
          id?: string
          license_name: string
          license_type: string
          price: number
          producer_id: string
          status?: string
        }
        Update: {
          beat_id?: string
          buyer_id?: string
          contract_snapshot?: string
          created_at?: string
          id?: string
          license_name?: string
          license_type?: string
          price?: number
          producer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          reference: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          reference?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          reference?: string | null
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          created_at: string
          id: string
          is_verified: boolean | null
          paystack_subaccount_code: string | null
          paystack_subaccount_id: number | null
          producer_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          paystack_subaccount_code?: string | null
          paystack_subaccount_id?: number | null
          producer_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          paystack_subaccount_code?: string | null
          paystack_subaccount_id?: number | null
          producer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      producer_followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          producer_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          producer_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          producer_id?: string
        }
        Relationships: []
      }
      producer_profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          brand_color: string
          city: string | null
          country: string | null
          created_at: string
          instagram: string | null
          logo_url: string | null
          producer_name: string
          producer_tag: string
          spotify: string | null
          tiktok: string | null
          updated_at: string
          user_id: string
          username: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_color?: string
          city?: string | null
          country?: string | null
          created_at?: string
          instagram?: string | null
          logo_url?: string | null
          producer_name: string
          producer_tag?: string
          spotify?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
          username: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_color?: string
          city?: string | null
          country?: string | null
          created_at?: string
          instagram?: string | null
          logo_url?: string | null
          producer_name?: string
          producer_tag?: string
          spotify?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      producer_wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          lifetime_earnings: number
          pending_balance: number
          producer_id: string
          sales_count: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_earnings?: number
          pending_balance?: number
          producer_id: string
          sales_count?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          lifetime_earnings?: number
          pending_balance?: number
          producer_id?: string
          sales_count?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email?: string | null
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          beat_id: string
          beat_title: string
          buyer_id: string
          contract_snapshot: string
          created_at: string
          currency: string
          download_status: string
          gross_amount: number
          id: string
          invoice_number: string
          license_name: string
          license_type: string
          net_amount: number
          payment_provider: string
          payment_status: string
          payout_mode: string
          platform_commission: number
          producer_earnings: number
          producer_id: string
          provider_fee: number
          provider_reference: string | null
          purchased_at: string
          updated_at: string
        }
        Insert: {
          beat_id: string
          beat_title?: string
          buyer_id: string
          contract_snapshot?: string
          created_at?: string
          currency?: string
          download_status?: string
          gross_amount: number
          id?: string
          invoice_number?: string
          license_name: string
          license_type: string
          net_amount: number
          payment_provider?: string
          payment_status?: string
          payout_mode?: string
          platform_commission: number
          producer_earnings: number
          producer_id: string
          provider_fee?: number
          provider_reference?: string | null
          purchased_at?: string
          updated_at?: string
        }
        Update: {
          beat_id?: string
          beat_title?: string
          buyer_id?: string
          contract_snapshot?: string
          created_at?: string
          currency?: string
          download_status?: string
          gross_amount?: number
          id?: string
          invoice_number?: string
          license_name?: string
          license_type?: string
          net_amount?: number
          payment_provider?: string
          payment_status?: string
          payout_mode?: string
          platform_commission?: number
          producer_earnings?: number
          producer_id?: string
          provider_fee?: number
          provider_reference?: string | null
          purchased_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_pack_purchases: {
        Row: {
          buyer_id: string
          gross_amount: number
          id: string
          invoice_number: string | null
          payment_reference: string | null
          payment_status: string | null
          platform_commission: number
          producer_earnings: number
          producer_id: string
          purchased_at: string | null
          sample_pack_id: string
        }
        Insert: {
          buyer_id: string
          gross_amount: number
          id?: string
          invoice_number?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          platform_commission?: number
          producer_earnings: number
          producer_id: string
          purchased_at?: string | null
          sample_pack_id: string
        }
        Update: {
          buyer_id?: string
          gross_amount?: number
          id?: string
          invoice_number?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          platform_commission?: number
          producer_earnings?: number
          producer_id?: string
          purchased_at?: string | null
          sample_pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_pack_purchases_sample_pack_id_fkey"
            columns: ["sample_pack_id"]
            isOneToOne: false
            referencedRelation: "sample_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_packs: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          preview_url: string | null
          price: number
          producer_id: string
          title: string
          updated_at: string | null
          zip_url: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          preview_url?: string | null
          price?: number
          producer_id: string
          title: string
          updated_at?: string | null
          zip_url: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          preview_url?: string | null
          price?: number
          producer_id?: string
          title?: string
          updated_at?: string | null
          zip_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          producer_id: string
          reference: string
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          producer_id: string
          reference: string
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          producer_id?: string
          reference?: string
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_producer_wallet: {
        Args: { _amount: number; _pending?: boolean; _producer_id: string }
        Returns: undefined
      }
      get_subaccount_for_beat: { Args: { _beat_id: string }; Returns: string }
      get_subaccount_for_sample_pack: {
        Args: { pack_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_verified_marketplace_purchase: {
        Args: {
          _beat_id: string
          _beat_title: string
          _buyer_id: string
          _contract_snapshot: string
          _gross_amount: number
          _license_name: string
          _license_type: string
          _platform_commission: number
          _producer_earnings: number
          _producer_id: string
          _provider_reference: string
        }
        Returns: {
          beat_id: string
          beat_title: string
          buyer_id: string
          contract_snapshot: string
          created_at: string
          currency: string
          download_status: string
          gross_amount: number
          id: string
          invoice_number: string
          license_name: string
          license_type: string
          net_amount: number
          payment_provider: string
          payment_status: string
          payout_mode: string
          platform_commission: number
          producer_earnings: number
          producer_id: string
          provider_fee: number
          provider_reference: string | null
          purchased_at: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_withdrawal: {
        Args: { _amount: number; _producer_id: string; _reference: string }
        Returns: string
      }
      settle_withdrawal: {
        Args: { _note?: string; _status: string; _withdrawal_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "artist" | "producer"
      app_role: "admin" | "moderator" | "user"
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
      account_type: ["artist", "producer"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
