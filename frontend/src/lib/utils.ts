import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/**
 * Distance between two lat/lng points in KM (Haversine formula)
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Human-friendly labels for request statuses
 */
export function requestStatusLabel(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "approved" || s === "accepted") return "Approved";
  if (s === "rejected") return "Rejected";
  if (s === "collected" || s === "completed") return "Collected";
  return status || "Unknown";
}
