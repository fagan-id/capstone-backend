/**
 * Controller Rute Super Admin - Dashboard.
 * Mengorkestrasi ringkasan statistik KPI dan feed aktivitas terbaru.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import { validasiQueryDashboard } from "../../validators/superAdmin/superAdminDashboard.js";
import * as dashboardService from "../../services/superAdmin/superAdminDashboard.js";

/**
 * GET /api/super-admin/dashboard
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
