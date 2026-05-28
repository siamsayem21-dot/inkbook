export interface Studio {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  address: string | null;
  state: string | null;
  ownerId: string;
  createdAt: string;
}

export interface StudioWithOwner extends Studio {
  ownerName: string;
  ownerEmail: string;
}
