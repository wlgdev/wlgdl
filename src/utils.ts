export function getDateString(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(
    date.getMinutes(),
  )}-${pad(date.getSeconds())}`;
}

export function generateFilename(id: string, ext: string, start_time = Date.now()): string {
  return `${id}_${getDateString()}_${Math.round((Date.now() - start_time) / 1000)}.${ext}`;
}

export async function exist(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}
