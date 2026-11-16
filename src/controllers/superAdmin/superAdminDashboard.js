/**
 * Controller Rute Super Admin - Dashboard dan Logout.
 * Mengorkestrasi statistik KPI, feed aktivitas terbaru, dan pengakhiran sesi Super Admin.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/index.js";
import { validasiQueryDashboard } from "../../validators/superAdmin/superAdminDashboard.js";
import * as dashboardService from "../../services/superAdmin/superAdminDashboard.js";

/**
 * GET /api/super-admin/dashboard (dan alias /api/admin/dashboard)
 * Mengambil ringkasan statistik KPI (total sekolah, sekolah aktif, sesi aktif, total siswa)
 * serta feed aktivitas terbaru dengan paginasi dan filter kategori.
 */
export async function getDashboard(req, res, next) {
  try {
    const query = validasiQueryDashboard(req.query);
    const data = await dashboardService.getDashboardData(prisma, query);

    return ApiResponse.success(res, {
      message: "Data dashboard Super Admin berhasil dimuat.",
      data
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/super-admin/logout (dan alias /api/admin/logout)
 * Mengakhiri sesi pengguna Super Admin dan menghapus cookie autentikasi.
 * Catatan: Pada implementasi stateless JWT, token pada client-side storage (jika disimpan)
 * harus dihapus oleh client. Cookie HTTP-only dibersihkan melalui header Set-Cookie.
 */
export async function logoutSuperAdmin(req, res, next) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: !config.isDevelopment,
      sameSite: "lax"
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Logout berhasil. Sesi Super Admin telah diakhiri."
    });
  } catch (err) {
    return next(err);
  }
}
