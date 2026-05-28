export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idPhotoUrl: string | null;
  createdAt: string;
}

export interface ClientWithHistory extends Client {
  totalSessions: number;
  lastVisit: string | null;
  noShowCount: number;
  isBlacklisted: boolean;
}

export interface ConsentForm {
  id: string;
  bookingId: string;
  clientId: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianSignature: string | null;
  clientSignature: string;
  idPhotoUrl: string;
  stateTemplate: string;
  signedAt: string;
}

export interface SessionAgreement {
  id: string;
  bookingId: string;
  artistId: string;
  clientId: string;
  designDescription: string;
  placement: string;
  agreedPrice: number;
  clientSignature: string;
  signedAt: string;
}
