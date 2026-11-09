/**
 * Penilaian Skrining Level 1 (pola DSM-5 Cross-Cutting Symptom Measure).
 * Aturannya per butir per domain: satu jawaban yang mencapai ambang domain sudah menandai domain itu.
 * Bukan penjumlahan seluruh jawaban (D43).
 */

/**
 * Menilai setiap domain dari jawaban yang sudah tersimpan.
 * @param {{
 *   kategori: Array<{ id: number, ambang_batas: number }>,
 *   pertanyaan: Array<{ id: number, kategori_asesmen_id: number }>,
 *   jawaban: Array<{ pertanyaan_id: number, skor: number }>
 * }} params
 * @returns {Array<{ kategori_asesmen_id: number, skor_tertinggi: number, ambang_batas: number, terindikasi: boolean }>}
 */
export function nilaiKategori({ kategori, pertanyaan, jawaban }) {
  const domainDari = new Map(pertanyaan.map((p) => [p.id, p.kategori_asesmen_id]));

  const tertinggi = new Map();
  for (const j of jawaban) {
    const kategoriId = domainDari.get(j.pertanyaan_id);
    if (kategoriId === undefined) continue;

    const sebelumnya = tertinggi.get(kategoriId);
    if (sebelumnya === undefined || j.skor > sebelumnya) tertinggi.set(kategoriId, j.skor);
  }

  return kategori.map((k) => {
    const skor = tertinggi.get(k.id);

    return {
      kategori_asesmen_id: k.id,
      skor_tertinggi: skor ?? 0,
      ambang_batas: k.ambang_batas,
      // Domain tanpa jawaban tidak pernah ditandai, walau ambangnya 0.
      terindikasi: skor !== undefined && skor >= k.ambang_batas
    };
  });
}
