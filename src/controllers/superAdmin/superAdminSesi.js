/**
 * Controller Super Admin - Sesi Skrining.
 * Super Admin boleh mengakhiri sesi milik sekolah mana pun.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as sesiService from "../../services/sekolah/sekolahSesi.js";
import { validasiIdSesi } from "../../validators/sekolah/sekolahSesi.js";

/** POST /api/super-admin/sesi/:id/akhiri */
export async function akhiriSesi(req, res, next) {
  try {
    const id = validasiIdSesi(req.params.id);
    const data = await sesiService.akhiriSesi(prisma, null, id);
    return ApiResponse.success(res, { message: "Sesi skrining berhasil diakhiri.", data });
  } catch (err) {
    return next(err);
  }
}
