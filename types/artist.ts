export interface Artist {
  id: string;
  studioId: string;
  userId: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  minimumRate: number;
  styles: string[];
  monthlyBookingCap: number;
  createdAt: string;
}

export interface ArtistPortfolioPhoto {
  id: string;
  artistId: string;
  url: string;
  style: string;
  uploadedAt: string;
}

export interface ArtistWithStats extends Artist {
  bookingsThisMonth: number;
  revenueThisMonth: number;
  noShowRate: number;
}
