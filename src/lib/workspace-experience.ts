import type { EnterpriseDashboardId } from "@/features/enterprise/registry";
import type { buildEnterpriseMonitoring } from "@/lib/enterprise-monitoring";

type Snapshot = ReturnType<typeof buildEnterpriseMonitoring>;

export type WorkspaceNudge = {
  id: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
};

export type DashboardBriefing = {
  state: "attention" | "steady" | "limited";
  eyebrow: string;
  title: string;
  description: string;
  actions: WorkspaceNudge[];
};

function nudge(
  id: string,
  title: string,
  detail: string,
  href: string,
  actionLabel: string,
): WorkspaceNudge {
  return { id, title, detail, href, actionLabel };
}

export function buildDashboardBriefing(
  id: EnterpriseDashboardId,
  snapshot: Snapshot,
): DashboardBriefing {
  const actions: WorkspaceNudge[] = [];
  let hasScope = true;

  switch (id) {
    case "ecosystem": {
      hasScope = snapshot.membership !== null;
      if (snapshot.membership?.needsVerification) {
        actions.push(nudge(
          "verify-members",
          "Periksa data anggota yang belum terverifikasi",
          snapshot.membership.needsVerification + " profil masih membutuhkan pemeriksaan sebelum digunakan sebagai data resmi.",
          "/dashboard/anggota",
          "Periksa keanggotaan",
        ));
      }
      if (snapshot.membership?.consentNeedsReview) {
        actions.push(nudge(
          "review-consent",
          "Lengkapi pemeriksaan persetujuan",
          snapshot.membership.consentNeedsReview + " catatan persetujuan perlu ditinjau agar penggunaan data dan dokumentasi tetap sesuai.",
          "/dashboard/persetujuan",
          "Tinjau persetujuan",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "open-notifications",
          "Jaga komunikasi tetap terhubung",
          "Tinjau pemberitahuan dan tindak lanjut agar informasi penting tidak terlewat.",
          "/dashboard/notifikasi",
          "Buka notifikasi",
        ));
      }
      break;
    }
    case "management": {
      const work = snapshot.operational;
      hasScope = work !== null;
      if (work?.overdueTasks) {
        actions.push(nudge(
          "overdue-tasks",
          "Dahulukan tugas yang melewati tenggat",
          work.overdueTasks + " tugas terbuka sudah melewati tanggal target. Perbarui status atau sepakati tindak lanjut baru.",
          "/dashboard/tindaklanjut",
          "Tinjau tugas terlambat",
        ));
      }
      if (work?.tasksAwaitingVerification) {
        actions.push(nudge(
          "verify-results",
          "Verifikasi hasil pekerjaan",
          work.tasksAwaitingVerification + " hasil telah diajukan dan menunggu pemeriksaan.",
          "/dashboard/tindaklanjut",
          "Periksa hasil",
        ));
      }
      if (work?.tasksWithoutAssignee) {
        actions.push(nudge(
          "assign-work",
          "Tentukan penanggung jawab",
          work.tasksWithoutAssignee + " tugas terbuka belum memiliki PIC. Pembagian tugas yang jelas membantu pekerjaan bergerak.",
          "/dashboard/tindaklanjut",
          "Tetapkan PIC",
        ));
      }
      if (work?.tasksWithoutDueDate) {
        actions.push(nudge(
          "set-deadlines",
          "Lengkapi tenggat pekerjaan",
          work.tasksWithoutDueDate + " tugas terbuka belum memiliki tanggal target.",
          "/dashboard/tindaklanjut",
          "Lengkapi tenggat",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "plan-next-activity",
          "Siapkan langkah kegiatan berikutnya",
          "Periksa agenda dan laporan program untuk memastikan rencana, pelaksana, serta hasil tercatat.",
          "/dashboard/kegiatan",
          "Buka agenda kegiatan",
        ));
      }
      break;
    }
    case "administration": {
      hasScope = snapshot.membership !== null || snapshot.administration !== null;
      if (snapshot.membership?.needsVerification) {
        actions.push(nudge(
          "member-verification",
          "Rapikan verifikasi keanggotaan",
          snapshot.membership.needsVerification + " data anggota belum terverifikasi.",
          "/dashboard/anggota",
          "Buka keanggotaan",
        ));
      }
      if (snapshot.administration?.needsReview) {
        actions.push(nudge(
          "document-review",
          "Periksa dokumen yang perlu ditinjau",
          snapshot.administration.needsReview + " dokumen memiliki status pemeriksaan atau pembaruan yang belum tuntas.",
          "/dashboard/register",
          "Tinjau register",
        ));
      }
      if (snapshot.administration?.missingAttachments) {
        actions.push(nudge(
          "missing-attachments",
          "Lengkapi rujukan lampiran arsip",
          snapshot.administration.missingAttachments + " dokumen merujuk lampiran yang tidak tersedia di arsip.",
          "/dashboard/dokumen",
          "Periksa arsip",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "administration-routine",
          "Pertahankan arsip yang tertib",
          "Pastikan perubahan data, surat, dan dokumen memiliki sumber, versi, serta penanggung jawab.",
          "/dashboard/register",
          "Buka register dokumen",
        ));
      }
      break;
    }
    case "finance": {
      const finance = snapshot.finance;
      hasScope = finance !== null;
      if (finance?.invalidTransactions) {
        actions.push(nudge(
          "invalid-transactions",
          "Periksa transaksi yang tidak lolos validasi",
          finance.invalidTransactions + " transaksi perlu diperiksa sebelum saldo digunakan sebagai acuan.",
          "/dashboard/akuntansi",
          "Periksa jurnal",
        ));
      }
      if (finance?.missingEvidence) {
        actions.push(nudge(
          "missing-finance-evidence",
          "Lengkapi bukti transaksi",
          finance.missingEvidence + " catatan kas belum memiliki lampiran bukti.",
          "/dashboard/kas",
          "Buka buku kas",
        ));
      }
      if (finance && !finance.balanceSafe && !finance.invalidTransactions) {
        actions.push(nudge(
          "reconcile-balance",
          "Rekonsiliasi saldo sebelum digunakan",
          "Saldo belum aman ditampilkan sebagai angka final. Periksa kelengkapan dan validitas catatan terlebih dahulu.",
          "/dashboard/akuntansi",
          "Mulai rekonsiliasi",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "finance-routine",
          "Jaga keterlacakan transaksi",
          "Lanjutkan pencatatan tepat waktu dan pastikan setiap penerimaan maupun pengeluaran memiliki bukti.",
          "/dashboard/kas",
          "Catat transaksi",
        ));
      }
      break;
    }
    case "commerce": {
      const business = snapshot.business;
      hasScope = business !== null;
      if (business?.lotsOnHold) {
        actions.push(nudge(
          "lots-on-hold",
          "Periksa lot yang ditahan",
          business.lotsOnHold + " lot penerimaan menunggu pemeriksaan atau keputusan.",
          "/dashboard/lotkopi",
          "Periksa penerimaan",
        ));
      }
      if (business?.assetsNeedAttention) {
        actions.push(nudge(
          "asset-attention",
          "Tindak lanjuti kondisi aset",
          business.assetsNeedAttention + " aset memerlukan perawatan, perbaikan, atau verifikasi kondisi.",
          "/dashboard/aset",
          "Tinjau aset",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "commerce-routine",
          "Perkuat catatan usaha dan kemitraan",
          "Perbarui status penerimaan, komunikasi mitra, dan rencana usaha berdasarkan kejadian sebenarnya.",
          "/dashboard/kemitraan",
          "Buka kemitraan",
        ));
      }
      break;
    }
    case "publication": {
      const publication = snapshot.publication;
      hasScope = publication !== null;
      if (publication?.permissionNeedsReview) {
        actions.push(nudge(
          "publication-permissions",
          "Pastikan izin publikasi terdokumentasi",
          publication.permissionNeedsReview + " media belum memiliki status izin publikasi yang terkonfirmasi.",
          "/dashboard/galeri",
          "Periksa izin media",
        ));
      }
      if (publication?.drafts) {
        actions.push(nudge(
          "content-drafts",
          "Lanjutkan konten yang masih berupa draf",
          publication.drafts + " konten menunggu penyuntingan atau keputusan penerbitan.",
          "/dashboard/publikasi",
          "Lanjutkan konten",
        ));
      }
      if (!actions.length && hasScope) {
        actions.push(nudge(
          "publication-routine",
          "Jaga informasi tetap segar dan akurat",
          "Periksa informasi publik, dokumentasi, serta kanal pesan agar komunikasi kelompok tetap hidup.",
          "/dashboard/publikasi",
          "Kelola publikasi",
        ));
      }
      break;
    }
    case "system": {
      if (snapshot.qualityFindings) {
        actions.push(nudge(
          "quality-findings",
          "Selesaikan temuan kualitas data",
          snapshot.warningFindings + " peringatan dan " + snapshot.infoFindings + " pengingat tercatat pada data yang dapat diakses.",
          "/dashboard/monitoring",
          "Buka monitoring",
        ));
      }
      if (!actions.length) {
        actions.push(nudge(
          "system-routine",
          "Jadwalkan pemeriksaan akses dan konfigurasi",
          "Tinjau kewenangan akun, pengaturan, dan kualitas data secara berkala sesuai kebijakan organisasi.",
          "/dashboard/akun",
          "Tinjau hak akses",
        ));
      }
      break;
    }
  }

  if (!hasScope) {
    return {
      state: "limited",
      eyebrow: "INFORMASI SESUAI HAK AKSES",
      title: "Ruang kerja siap digunakan",
      description: "Belum ada sumber data yang dapat dipakai untuk menyusun rekomendasi pada ruang ini. Buka modul yang tersedia untuk peran Anda atau hubungi pengelola bila membutuhkan kewenangan tambahan.",
      actions: [],
    };
  }

  if (actions.length) {
    return {
      state: "attention",
      eyebrow: "ARAH TINDAKAN BERDASARKAN DATA",
      title: "Mari selesaikan hal yang paling berdampak",
      description: "Saran berikut dihitung dari catatan aktual yang dapat Anda akses. Pilih tindakan untuk langsung menuju modul sumber.",
      actions: actions.slice(0, 3),
    };
  }

  return {
    state: "steady",
    eyebrow: "RITME KERJA",
    title: "Belum ada tindak lanjut prioritas yang terdeteksi",
    description: "Tidak berarti pekerjaan sudah selesai seluruhnya. Lanjutkan pembaruan rutin, catat perkembangan, dan periksa kembali saat ada informasi baru.",
    actions: actions.slice(0, 3),
  };
}
