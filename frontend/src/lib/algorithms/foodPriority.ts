export const rankFoodsByPriority = (foods: any[]) => {
  return foods.sort((a, b) => {
    if (!a.expiry_time) return 1;
    if (!b.expiry_time) return -1;
    return new Date(a.expiry_time).getTime() - new Date(b.expiry_time).getTime();
  });
};

export const isExpiringSoon = (expiryTime: string | null): boolean => {
  if (!expiryTime) return false;
  const diff = new Date(expiryTime).getTime() - Date.now();
  const hours = diff / (1000 * 60 * 60);
  return hours <= 2 && hours >= 0;
};