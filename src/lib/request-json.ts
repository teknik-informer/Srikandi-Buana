export async function requestJSON<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 25000,
  timeoutMessage?: string,
) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let data: T | null = null;
    try {
      data = (await response.json()) as T;
    } catch (error) {
      if (controller.signal.aborted) throw error;
    }
    return { response, data };
  } catch (error) {
    if (timedOut)
      throw Error(
        timeoutMessage || (init.method && init.method !== "GET"
          ? "Koneksi terlalu lama. Status penyimpanan belum dapat dipastikan. Muat ulang data untuk memeriksa sebelum mengirim ulang."
          : "Data terlalu lama merespons. Periksa koneksi lalu coba muat ulang."),
      );
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}
