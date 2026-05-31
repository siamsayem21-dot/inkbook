export type UserRole = "owner" | "artist";

export type BookingStatus =
  | "pending_deposit"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Database {
  public: {
    Tables: {
      studios: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          logo_url: string | null;
          address: string | null;
          state: string | null;
          owner_id: string;
          plan: string;
          subscription_status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["studios"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["studios"]["Insert"]>;
      };
      artists: {
        Row: {
          id: string;
          studio_id: string;
          user_id: string;
          name: string;
          email: string;
          bio: string | null;
          avatar_url: string | null;
          minimum_rate: number;
          styles: string[];
          monthly_booking_cap: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artists"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["artists"]["Insert"]>;
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          id_photo_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          studio_id: string;
          artist_id: string;
          client_id: string;
          date: string;
          time: string;
          style: string;
          description: string | null;
          status: BookingStatus;
          deposit_amount: number;
          deposit_paid: boolean;
          deposit_paid_at: string | null;
          deposit_kept: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      consent_forms: {
        Row: {
          id: string;
          booking_id: string;
          client_id: string;
          is_minor: boolean;
          guardian_name: string | null;
          guardian_signature: string | null;
          client_signature: string;
          id_photo_url: string;
          state_template: string;
          signed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["consent_forms"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["consent_forms"]["Insert"]>;
      };
      blacklist: {
        Row: {
          id: string;
          studio_id: string;
          blocked_by: string;
          client_email: string | null;
          client_phone: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["blacklist"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["blacklist"]["Insert"]>;
      };
      session_agreements: {
        Row: {
          id: string;
          booking_id: string;
          artist_id: string;
          client_id: string;
          design_description: string;
          placement: string;
          agreed_price: number;
          client_signature: string;
          signed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["session_agreements"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["session_agreements"]["Insert"]>;
      };
      waitlist: {
        Row: {
          id: string;
          studio_id: string;
          artist_id: string;
          client_id: string;
          preferred_style: string | null;
          added_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["waitlist"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_client_blacklisted: {
        Args: { p_studio_id: string; p_email: string; p_phone: string };
        Returns: boolean;
      };
      artist_bookings_this_month: {
        Args: { p_artist_id: string };
        Returns: number;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      user_role: UserRole;
    };
  };
}
