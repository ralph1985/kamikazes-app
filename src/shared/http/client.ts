export type ApiError = { message: string; code?: string };

export type ApiResult<T> = { data?: T; error?: ApiError };

export async function readApiResult<T>(response: Response): Promise<ApiResult<T>> {
  try {
    return (await response.json()) as ApiResult<T>;
  } catch {
    return { error: { message: "La respuesta del servidor no es válida" } };
  }
}

export async function requestApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const result = await readApiResult<T>(response);
  if (!response.ok || result.data === undefined) {
    throw new Error(result.error?.message ?? "No se pudo completar la operación");
  }
  return result.data;
}

export async function requestApiVoid(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const result = await readApiResult<unknown>(response);
  if (!response.ok) throw new Error(result.error?.message ?? "No se pudo completar la operación");
}
