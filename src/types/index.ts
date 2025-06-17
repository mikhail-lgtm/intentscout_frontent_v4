export interface User {
  id: string;
  email: string;
  organizationId?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}

export type TabKey = "signals" | "outreach" | "settings";