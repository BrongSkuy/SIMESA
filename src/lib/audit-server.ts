import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { desc, and, or, like, eq, gte, lte, sql } from "drizzle-orm";
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
 */
export async function getAuditSummary(): Promise<AuditSummaryStats> {
  try {
    const allLogs = await db.select().from(activityLogs);

    const now = new Date();
    const todayPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const totalHariIni = allLogs.filter((log) =>
      log.createdAt.startsWith(todayPrefix)
    ).length;

    const akademikNilaiCount = allLogs.filter(
      (log) => log.module === "AKADEMIK_NILAI" || log.module === "E_RAPOR"
    ).length;

    const kesiswaanDisiplinCount = allLogs.filter(
      (log) => log.module === "BUKU_POIN" || log.module === "KONSELING_BK"
    ).length;

    const keamananAkunCount = allLogs.filter(
      (log) => log.module === "AUTENTIKASI" || log.module === "MANAJEMEN_PENGGUNA"
    ).length;

    return {
      totalHariIni,
      akademikNilaiCount,
      kesiswaanDisiplinCount,
      keamananAkunCount,
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
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 15));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.module && filters.module !== "all") {
      conditions.push(eq(activityLogs.module, filters.module as any));
    }

    if (filters.action && filters.action !== "all") {
      conditions.push(eq(activityLogs.action, filters.action as any));
    }

    if (filters.userRole && filters.userRole !== "all") {
      conditions.push(eq(activityLogs.userRole, filters.userRole));
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
