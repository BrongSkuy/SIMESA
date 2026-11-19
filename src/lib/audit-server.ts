import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { desc, and, or, like, eq, gte, lte, sql } from "drizzle-orm";
import { getTodayWIB } from "@/lib/utils";
import {
  AuditAction,
  AuditModule,
  ActivityLogItem,
  AuditSummaryStats,
  AuditFilterParams,
} from "./audit";

export interface LogActivityParams {
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  createdAt?: string;
}

/**
 * Mencatat log aktivitas ke dalam tabel activity_logs secara aman (fail-safe).
 * Error pada fungsi ini tidak akan melempar exception agar alur transaksi utama tetap berjalan lancar.
 */
export async function logActivity(params: LogActivityParams): Promise<ActivityLogItem | null> {
  try {
    let detailsString: string | null = null;
    if (params.details) {
      detailsString =
        typeof params.details === "string"
          ? params.details
          : JSON.stringify(params.details);

      // Celah Bloat Defense: Batasi panjang payload metadata maksimal 5.000 karakter
      if (detailsString.length > 5000) {
        detailsString = detailsString.substring(0, 5000) + "... (terpotong demi efisiensi)";
      }
    }

    const newLog = {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      module: params.module,
      targetId: params.targetId || null,
      targetName: params.targetName || null,
      description: params.description,
      details: detailsString,
      ipAddress: params.ipAddress || null,
      createdAt: params.createdAt || new Date().toISOString(),
    };

    const [inserted] = await db.insert(activityLogs).values(newLog).returning();
    return (inserted as ActivityLogItem) || null;
  } catch (error) {
    console.error("[AuditLog Error] Gagal mencatat log aktivitas:", error);
    return null;
  }
}

/**
 * Mengambil ringkasan statistik aktivitas untuk Cockpit Banner.
 * Menggunakan agregasi SQL langsung (COUNT / SUM CASE) agar sangat cepat dan hemat RAM
 * meskipun tabel menampung puluhan ribu hingga ratusan ribu baris data.
 */
export async function getAuditSummary(): Promise<AuditSummaryStats> {
  try {
    const todayPrefix = getTodayWIB();

    const [stats] = await db
      .select({
        totalHariIni: sql<number>`COALESCE(SUM(CASE WHEN ${activityLogs.createdAt} >= ${todayPrefix} THEN 1 ELSE 0 END), 0)`,
        akademikNilaiCount: sql<number>`COALESCE(SUM(CASE WHEN ${activityLogs.module} IN ('AKADEMIK_NILAI', 'E_RAPOR') THEN 1 ELSE 0 END), 0)`,
        kesiswaanDisiplinCount: sql<number>`COALESCE(SUM(CASE WHEN ${activityLogs.module} IN ('BUKU_POIN', 'KONSELING_BK') THEN 1 ELSE 0 END), 0)`,
        keamananAkunCount: sql<number>`COALESCE(SUM(CASE WHEN ${activityLogs.module} IN ('AUTENTIKASI', 'MANAJEMEN_PENGGUNA') THEN 1 ELSE 0 END), 0)`,
      })
      .from(activityLogs);

    return {
      totalHariIni: Number(stats?.totalHariIni || 0),
      akademikNilaiCount: Number(stats?.akademikNilaiCount || 0),
      kesiswaanDisiplinCount: Number(stats?.kesiswaanDisiplinCount || 0),
      keamananAkunCount: Number(stats?.keamananAkunCount || 0),
    };
  } catch (error) {
    console.error("[AuditLog Error] Gagal mengambil ringkasan statistik:", error);
    return {
      totalHariIni: 0,
      akademikNilaiCount: 0,
      kesiswaanDisiplinCount: 0,
      keamananAkunCount: 0,
    };
  }
}

/**
 * Membersihkan log aktivitas yang lebih lama dari jumlah hari tertentu (Retensi Data).
 * Menjamin kapasitas basis data tetap lega dan tidak over-bloat seiring berjalannya semester/tahun.
 */
export async function purgeOldAuditLogs(olderThanDays: number): Promise<number> {
  try {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const result = await db
      .delete(activityLogs)
      .where(lte(activityLogs.createdAt, cutoffDate))
      .returning({ id: activityLogs.id });

    return result.length;
  } catch (error) {
    console.error("[AuditLog Error] Gagal menghapus log lama:", error);
    return 0;
  }
}

/**
 * Mengambil daftar riwayat aktivitas dengan filter dan paginasi.
 */
export async function getActivityLogs(filters: AuditFilterParams = {}): Promise<{
  logs: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(50000, Number(filters.limit) || 15));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.module && filters.module !== "all") {
      conditions.push(eq(activityLogs.module, filters.module as any));
    }

    if (filters.action && filters.action !== "all") {
      conditions.push(eq(activityLogs.action, filters.action as any));
    }

    if (filters.userRole && filters.userRole !== "all") {
      const lower = filters.userRole.toLowerCase().trim();
      const upper = filters.userRole.toUpperCase().trim();
      if (lower === "superadmin" || lower === "super_admin") {
        conditions.push(
          or(
            eq(activityLogs.userRole, "superadmin"),
            eq(activityLogs.userRole, "SUPERADMIN"),
            eq(activityLogs.userRole, "super_admin"),
            eq(activityLogs.userRole, "SUPER_ADMIN")
          )
        );
      } else {
        conditions.push(
          or(
            eq(activityLogs.userRole, lower),
            eq(activityLogs.userRole, upper)
          )
        );
      }
    }

    if (filters.search && filters.search.trim() !== "") {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          like(activityLogs.userName, term),
          like(activityLogs.targetName, term),
          like(activityLogs.description, term)
        )
      );
    }

    if (filters.startDate) {
      conditions.push(gte(activityLogs.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      // End of that day
      const endDateTime = filters.endDate.includes("T")
        ? filters.endDate
        : `${filters.endDate}T23:59:59.999Z`;
      conditions.push(lte(activityLogs.createdAt, endDateTime));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Hitung total data
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);

    // Ambil baris data dengan limit & offset
    const rows = await db
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs: rows as ActivityLogItem[],
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error("[AuditLog Error] Gagal mengambil daftar log aktivitas:", error);
    return {
      logs: [],
      total: 0,
      page: 1,
      limit: 15,
      totalPages: 1,
    };
  }
}
