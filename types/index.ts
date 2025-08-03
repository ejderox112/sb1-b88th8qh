export interface POI {
  id: string;
  name: string;
  type: 'store' | 'wc' | 'elevator' | 'stairs' | 'restaurant' | 'exit' | 'info';
  latitude: number;
  longitude: number;
  floor: number;
  description?: string;
  isApproved: boolean;
  createdBy: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  floors: number;
}

export interface Suggestion {
  id: string;
  poiName: string;
  type: POI['type'];
  latitude: number;
  longitude: number;
  floor: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
}