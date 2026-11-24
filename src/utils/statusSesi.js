/**
 * Status sesi dihitung dari jam, tidak disimpan, supaya tidak pernah berbeda dengan waktu sebenarnya.
 * @param {{ waktu_mulai: Date, waktu_selesai: Date }} sesi
 * @param {Date} [now]
 * @returns {"menunggu"|"aktif"|"selesai"}
 */
export function statusSesi(sesi, now = new Date()) {
  if (now < sesi.waktu_mulai) return "menunggu";
  if (now < sesi.waktu_selesai) return "aktif";
  return "selesai";
}

/**
 * Filter Prisma untuk sesi yang sedang aktif; batasnya sama dengan `statusSesi`.
 * @param {Date} [now]
 */
export function filterSesiAktif(now = new Date()) {
  return { waktu_mulai: { lte: now }, waktu_selesai: { gt: now } };
}
