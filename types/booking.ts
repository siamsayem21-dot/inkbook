export type BookingStatus =
  | "pending_deposit"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Booking {
  id: string;
  studioId: string;
  artistId: string;
  clientId: string;
  date: string;
  time: string;
  style: string;
  description: string | null;
  status: BookingStatus;
  depositAmount: number;
  depositPaid: boolean;
  depositPaidAt: string | null;
  depositKept: boolean;
  createdAt: string;
}

export interface BookingWithRelations extends Booking {
  artistName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  consentFormSigned: boolean;
}

export interface CreateBookingInput {
  artistId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  style: string;
  description?: string;
  depositAmount: number;
}
