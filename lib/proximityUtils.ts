export function isWithinRadius(userLat, userLng, targetLat, targetLng, radiusMeters) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(targetLat - userLat);
  const dLng = toRad(targetLng - userLng);

  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(userLat)) * Math.cos(toRad(targetLat)) *
            Math.sin(dLng/2)**2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance <= radiusMeters;
}

export function filterVisibleUsers(myLat, myLng, myLevel, allUsers) {
  const radius = myLevel >= 40 ? 500 : 50;
  const minLevel = myLevel >= 40 ? 1 : 10;

  return allUsers.filter(
    ({ lat, lng, profiles }) =>
      profiles.level >= minLevel &&
      isWithinRadius(myLat, myLng, lat, lng, radius)
  );
}