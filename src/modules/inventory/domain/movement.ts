export function hasMovementEndpoint(fromLocationId: string | null, toLocationId: string | null) {
  return Boolean(fromLocationId || toLocationId);
}

export function usesDifferentMovementEndpoints(
  fromLocationId: string | null,
  toLocationId: string | null,
) {
  return fromLocationId !== toLocationId;
}
