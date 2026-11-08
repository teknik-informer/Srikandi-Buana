const field = (key, label, type, options = {}) => ({ key, label, type, ...options });

export const TEMPLATE_CATALOG_VERSION = "1.0.0";

export const opportunityStages = Object.freeze([
  "reference",
  "initial_contact",
  "training_of_trainers",
  "documents_pending",
  "proposal_received",
  "proposal_preparation",
  "proposal_submitted",
  "negotiation",
  "agreement_signed",
  "ready_for_activation",
  "active",
  "completed",
  "declined",
  "paused",
]);

/**
 * These are reusable form definitions, not live dashboard forms yet.
 * No template creates an agreement, beneficiary, target, budget or certification
 * claim. A real record is created only after the future form workflow is wired
 * to authenticated APIs and the user submits an actual source.
 */
export const operationalTemplates = Object.freeze([
  {
    id: "partner-engagement-log",
    version: 1,
    name: "Catatan Penjajakan Mitra",
    description: "Merekam perkenalan, komunikasi awal, undangan pelatihan, dan perkembangan pembahasan mitra.",
    category: "kemitraan",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [
      { id: "identity", title: "Identitas komunikasi" },
      { id: "discussion", title: "Hasil pembahasan" },
      { id: "follow_up", title: "Tindak lanjut" },
    ],
    fields: [
      field("partnerName", "Nama lembaga/mitra", "text", { section: "identity", required: true, maxLength: 180 }),
      field("partnerUnit", "Unit/divisi atau program mitra", "text", { section: "identity", maxLength: 180 }),
      field("officialWebsite", "Situs resmi", "url", { section: "identity", maxLength: 500 }),
      field("contactName", "Narahubung", "text", { section: "identity", maxLength: 160, sensitivity: "personal" }),
      field("contactRole", "Jabatan narahubung", "text", { section: "identity", maxLength: 120 }),
      field("contactChannel", "Saluran komunikasi", "select", { section: "identity", options: ["Pertemuan langsung", "Telepon", "WhatsApp", "Email", "Pelatihan", "Lainnya"] }),
      field("interactionDate", "Tanggal komunikasi/kegiatan", "date", { section: "identity", required: true }),
      field("interactionStage", "Tahap hubungan", "select", { section: "identity", required: true, options: opportunityStages }),
      field("summary", "Ringkasan hal yang benar-benar disampaikan", "textarea", { section: "discussion", required: true, maxLength: 5000 }),
      field("expectations", "Harapan atau minat kelompok", "textarea", { section: "discussion", maxLength: 3000 }),
      field("documentsPromised", "Dokumen yang dijanjikan/diminta", "textarea", { section: "discussion", maxLength: 3000 }),
      field("nextAction", "Langkah berikutnya", "textarea", { section: "follow_up", maxLength: 2000 }),
      field("owner", "Penanggung jawab tindak lanjut", "text", { section: "follow_up", maxLength: 160 }),
      field("nextReviewDate", "Tanggal tindak lanjut berikutnya", "date", { section: "follow_up" }),
      field("evidenceFileId", "Referensi arsip notulen/foto/email (opsional)", "text", { section: "follow_up", maxLength: 100 }),
    ],
  },
  {
    id: "tot-session-record",
    version: 1,
    name: "Laporan Training of Trainers (ToT)",
    description: "Mencatat pelaksanaan pelatihan, materi, fasilitator, peserta, pembelajaran dan tindak lanjut tanpa menganggapnya sebagai perjanjian program.",
    category: "pelatihan",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [
      { id: "session", title: "Informasi pelatihan" },
      { id: "learning", title: "Materi dan pembelajaran" },
      { id: "outputs", title: "Hasil dan tindak lanjut" },
      { id: "evidence", title: "Bukti kegiatan" },
    ],
    fields: [
      field("partnerName", "Penyelenggara/mitra", "text", { section: "session", required: true, maxLength: 180 }),
      field("sessionTitle", "Nama/judul ToT", "text", { section: "session", required: true, maxLength: 220 }),
      field("startDate", "Tanggal mulai", "date", { section: "session", required: true }),
      field("endDate", "Tanggal selesai", "date", { section: "session" }),
      field("venue", "Lokasi pelatihan", "text", { section: "session", maxLength: 240 }),
      field("facilitators", "Fasilitator/pelatih", "textarea", { section: "session", maxLength: 1500 }),
      field("groupRepresentatives", "Perwakilan kelompok yang hadir", "textarea", { section: "session", maxLength: 1500 }),
      field("objectives", "Tujuan pembelajaran yang disampaikan", "textarea", { section: "learning", maxLength: 3000 }),
      field("topics", "Materi/topik yang dibahas", "textarea", { section: "learning", required: true, maxLength: 5000 }),
      field("materials", "Bahan/modul yang diterima", "textarea", { section: "learning", maxLength: 3000 }),
      field("learningNotes", "Catatan pemahaman, pertanyaan dan hal yang belum jelas", "textarea", { section: "learning", maxLength: 5000 }),
      field("actualParticipantCount", "Jumlah peserta aktual (isi setelah daftar hadir diperiksa)", "number", { section: "outputs", min: 0, max: 10000 }),
      field("learningAssessment", "Evaluasi pembelajaran (bila dilakukan)", "textarea", { section: "outputs", maxLength: 3000 }),
      field("actionPlan", "Rencana tindak lanjut kelompok", "textarea", { section: "outputs", maxLength: 5000 }),
      field("trainerRecognition", "Status sertifikat/kompetensi pelatih", "select", { section: "outputs", options: ["Tidak ada informasi", "Tidak diterbitkan", "Diterbitkan dan bukti tersedia", "Menunggu konfirmasi"] }),
      field("trainerRecognitionEvidenceId", "Bukti sertifikat (jika benar-benar diterbitkan)", "text", { section: "outputs", maxLength: 100 }),
      field("attendanceEvidenceId", "Referensi daftar hadir", "text", { section: "evidence", maxLength: 100 }),
      field("photoEvidenceId", "Referensi dokumentasi foto/video dengan izin", "text", { section: "evidence", maxLength: 100 }),
      field("reportEvidenceId", "Referensi laporan/materi di arsip", "text", { section: "evidence", maxLength: 100 }),
      field("preparedBy", "Penyusun catatan", "text", { section: "evidence", maxLength: 160 }),
    ],
  },
  {
    id: "tot-attendance-roster",
    version: 1,
    name: "Daftar Hadir ToT",
    description: "Template daftar hadir sederhana. Tidak meminta NIK, tanggal lahir, atau nomor rekening.",
    category: "pelatihan",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [{ id: "attendance", title: "Daftar peserta" }],
    fields: [
      field("sessionId", "Referensi kegiatan ToT", "text", { section: "attendance", required: true, maxLength: 100 }),
      field("participantName", "Nama peserta", "text", { section: "attendance", required: true, maxLength: 160, sensitivity: "personal" }),
      field("organisation", "Kelompok/lembaga asal", "text", { section: "attendance", maxLength: 180 }),
      field("participantRole", "Peran peserta", "text", { section: "attendance", maxLength: 120 }),
      field("attendanceStatus", "Kehadiran", "select", { section: "attendance", required: true, options: ["Hadir penuh", "Hadir sebagian", "Izin", "Tidak hadir"] }),
      field("attendanceDate", "Tanggal kehadiran", "date", { section: "attendance", required: true }),
      field("consentForPhotos", "Izin dokumentasi foto", "select", { section: "attendance", options: ["Belum ditanyakan", "Setuju sesuai tujuan yang dijelaskan", "Tidak setuju"] }),
    ],
  },
  {
    id: "tot-action-plan",
    version: 1,
    name: "Rencana Aksi Pasca-ToT",
    description: "Mengubah pembelajaran menjadi tugas yang memiliki penanggung jawab dan tenggat yang disepakati.",
    category: "pelatihan",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [{ id: "action", title: "Rencana aksi" }],
    fields: [
      field("totSessionId", "Referensi kegiatan ToT", "text", { section: "action", required: true, maxLength: 100 }),
      field("actionTitle", "Tindakan yang disepakati", "text", { section: "action", required: true, maxLength: 240 }),
      field("reason", "Manfaat/hasil yang ingin dicapai", "textarea", { section: "action", maxLength: 2000 }),
      field("responsiblePerson", "Penanggung jawab", "text", { section: "action", maxLength: 160 }),
      field("supportNeeded", "Dukungan yang dibutuhkan", "textarea", { section: "action", maxLength: 2000 }),
      field("dueDate", "Tenggat (hanya setelah disepakati)", "date", { section: "action" }),
      field("status", "Status pelaksanaan", "select", { section: "action", options: ["Belum dimulai", "Berjalan", "Selesai", "Ditunda"] }),
      field("actualResult", "Hasil pelaksanaan aktual", "textarea", { section: "action", maxLength: 3000 }),
      field("evidenceId", "Referensi bukti hasil", "text", { section: "action", maxLength: 100 }),
      field("reviewedBy", "Pemeriksa hasil (jika sudah diperiksa)", "text", { section: "action", maxLength: 160 }),
    ],
  },
  {
    id: "partner-document-register",
    version: 1,
    name: "Register Dokumen Mitra",
    description: "Daftar dokumen yang diminta, diterima, belum diterima, atau menunggu versi resmi.",
    category: "kemitraan",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [{ id: "document", title: "Register dokumen" }],
    fields: [
      field("partnerName", "Nama mitra", "text", { section: "document", required: true, maxLength: 180 }),
      field("documentTitle", "Nama dokumen", "text", { section: "document", required: true, maxLength: 240 }),
      field("documentType", "Jenis dokumen", "select", { section: "document", options: ["Undangan/pemberitahuan", "Materi pelatihan", "Formulir pendataan", "Panduan teknis", "Proposal", "MoU/PKS/Perjanjian", "Anggaran", "Template laporan", "Standar/annex", "Lainnya"] }),
      field("documentStatus", "Status dokumen", "select", { section: "document", required: true, options: ["Belum diminta", "Diminta", "Dijanjikan", "Diterima", "Perlu konfirmasi versi", "Diverifikasi keaslian/sumber", "Tidak berlaku"] }),
      field("sourcePerson", "Pemberi/pengirim dokumen", "text", { section: "document", maxLength: 160 }),
      field("receivedDate", "Tanggal diterima", "date", { section: "document" }),
      field("versionOrDate", "Nomor versi/tanggal dokumen", "text", { section: "document", maxLength: 120 }),
      field("fileId", "Referensi arsip digital (jika tersedia)", "text", { section: "document", maxLength: 100 }),
      field("verificationNote", "Catatan pemeriksaan sumber/keaslian", "textarea", { section: "document", maxLength: 3000 }),
      field("owner", "Penanggung jawab dokumen", "text", { section: "document", maxLength: 160 }),
    ],
  },
  {
    id: "program-preparation-checklist",
    version: 1,
    name: "Kesiapan Program Sebelum Perjanjian",
    description: "Checklist pra-kontrak. Tidak mengaktifkan program dan tidak menganggap tawaran sebagai dana/mandat.",
    category: "program",
    lifecycle: "pre_agreement",
    formStatus: "template_ready",
    sections: [
      { id: "mandate", title: "Status mandat" },
      { id: "scope", title: "Ruang lingkup dan kelayakan" },
      { id: "controls", title: "Tata kelola dan pengamanan" },
      { id: "next", title: "Keputusan berikutnya" },
    ],
    fields: [
      field("partnerName", "Nama mitra", "text", { section: "mandate", required: true, maxLength: 180 }),
      field("relationshipStage", "Tahap saat ini", "select", { section: "mandate", required: true, options: opportunityStages }),
      field("writtenMandateStatus", "Status penawaran/perjanjian tertulis", "select", { section: "mandate", required: true, options: ["Belum ada", "Undangan/ToT", "Penawaran tertulis", "Draft perjanjian", "Sudah ditandatangani", "Perlu verifikasi"] }),
      field("signedAgreementFileId", "Referensi perjanjian yang telah ditandatangani (jika ada)", "text", { section: "mandate", maxLength: 100 }),
      field("counterpartConfirmed", "Narahubung resmi sudah dikonfirmasi", "select", { section: "mandate", options: ["Belum", "Ya", "Perlu konfirmasi"] }),
      field("programPurpose", "Tujuan yang telah dikonfirmasi", "textarea", { section: "scope", maxLength: 3000 }),
      field("geographicScope", "Wilayah yang disebutkan secara resmi", "textarea", { section: "scope", maxLength: 2000 }),
      field("commodityScope", "Komoditas/kelompok sasaran yang disebutkan", "textarea", { section: "scope", maxLength: 2000 }),
      field("eligibilityKnown", "Kriteria penerima manfaat sudah tersedia", "select", { section: "scope", options: ["Belum", "Sebagian", "Sudah tertulis", "Perlu klarifikasi"] }),
      field("budgetStatus", "Informasi anggaran", "select", { section: "scope", options: ["Belum dibahas", "Informasi awal", "Draft", "Disahkan dalam perjanjian"] }),
      field("dataSharingStatus", "Ketentuan pembagian data", "select", { section: "controls", options: ["Belum diketahui", "Perlu dibahas", "Sudah ditinjau", "Disetujui dengan batasan tertulis"] }),
      field("safeguardingContact", "Penanggung jawab/saluran pengaduan", "text", { section: "controls", maxLength: 240 }),
      field("reportingRequirements", "Format/frekuensi laporan yang diminta", "textarea", { section: "controls", maxLength: 3000 }),
      field("openQuestions", "Hal yang perlu diklarifikasi sebelum menyetujui", "textarea", { section: "next", maxLength: 5000 }),
      field("recommendedDecision", "Keputusan internal", "select", { section: "next", options: ["Lanjut penjajakan", "Minta dokumen", "Minta klarifikasi", "Siapkan proposal", "Tunda", "Tidak dilanjutkan"] }),
      field("reviewOwner", "Penanggung jawab pemeriksaan internal", "text", { section: "next", maxLength: 160 }),
    ],
  },
  {
    id: "member-intake-basic",
    version: 1,
    name: "Pendataan Dasar Anggota",
    description: "Pendataan minimum untuk layanan kelompok. Data identitas sensitif tidak dikumpulkan melalui formulir umum.",
    category: "anggota",
    lifecycle: "core_template",
    formStatus: "template_ready",
    sections: [{ id: "profile", title: "Data dasar" }, { id: "purpose", title: "Kebutuhan dan persetujuan" }],
    fields: [
      field("fullName", "Nama lengkap", "text", { section: "profile", required: true, maxLength: 160, sensitivity: "personal" }),
      field("preferredName", "Nama panggilan", "text", { section: "profile", maxLength: 100, sensitivity: "personal" }),
      field("village", "Desa", "text", { section: "profile", maxLength: 120 }),
      field("hamlet", "Dusun", "text", { section: "profile", maxLength: 120 }),
      field("contactPhone", "Nomor kontak (opsional)", "text", { section: "profile", maxLength: 40, sensitivity: "personal" }),
      field("membershipStatus", "Status keanggotaan", "select", { section: "profile", options: ["Pengajuan", "Aktif setelah verifikasi", "Tidak aktif", "Mengundurkan diri"] }),
      field("farmingActivities", "Kegiatan pertanian yang dilakukan", "textarea", { section: "purpose", maxLength: 3000 }),
      field("needsAndInterests", "Kebutuhan/minat pelatihan atau layanan", "textarea", { section: "purpose", maxLength: 3000 }),
      field("dataNoticeVersion", "Versi pemberitahuan pendataan", "text", { section: "purpose", required: true, maxLength: 60 }),
      field("dataConsent", "Persetujuan untuk pendataan sesuai tujuan yang dijelaskan", "select", { section: "purpose", required: true, options: ["Belum diminta", "Setuju", "Tidak setuju", "Perlu penjelasan"] }),
      field("photoConsent", "Persetujuan foto/publikasi (terpisah)", "select", { section: "purpose", options: ["Belum ditanyakan", "Setuju sesuai tujuan", "Tidak setuju"] }),
    ],
  },
  {
    id: "beneficiary-enrolment",
    version: 1,
    name: "Pendaftaran Penerima Manfaat",
    description: "Pendaftaran per program dengan kriteria eligibility dan persetujuan yang terpisah.",
    category: "program",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "enrolment", title: "Enrolmen program" }],
    fields: [
      field("programId", "Program", "text", { section: "enrolment", required: true }),
      field("personId", "Referensi anggota/peserta", "text", { section: "enrolment", required: true }),
      field("eligibilityRuleVersion", "Versi kriteria kelayakan", "text", { section: "enrolment", required: true }),
      field("eligibilityDecision", "Keputusan kelayakan", "select", { section: "enrolment", options: ["Menunggu pemeriksaan", "Memenuhi", "Tidak memenuhi", "Banding"] }),
      field("decisionReason", "Alasan keputusan", "textarea", { section: "enrolment", maxLength: 3000 }),
      field("consentRecordId", "Referensi persetujuan program", "text", { section: "enrolment" }),
    ],
  },
  {
    id: "farm-plot-registry",
    version: 1,
    name: "Profil Petani dan Kebun",
    description: "Template dasar kebun. Pemetaan presisi dan dokumen tenurial menunggu kebijakan akses dan persetujuan khusus.",
    category: "pertanian",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "producer", title: "Petani/produksi" }, { id: "farm", title: "Kebun/lahan" }],
    fields: [
      field("personId", "Referensi petani", "text", { section: "producer", required: true }),
      field("producerCode", "Kode petani", "text", { section: "producer", maxLength: 80 }),
      field("farmCode", "Kode kebun", "text", { section: "farm", required: true, maxLength: 80 }),
      field("village", "Desa/lokasi umum", "text", { section: "farm", maxLength: 160 }),
      field("commodity", "Komoditas", "text", { section: "farm", required: true, maxLength: 120 }),
      field("areaValue", "Luas (jika diketahui dan diperlukan)", "number", { section: "farm", min: 0 }),
      field("areaUnit", "Satuan luas", "select", { section: "farm", options: ["ha", "m2", "acre", "Belum diketahui"] }),
      field("mappingConsentId", "Referensi persetujuan pemetaan (jika dipetakan)", "text", { section: "farm" }),
      field("mappingEvidenceId", "Referensi bukti sumber peta/pengukuran", "text", { section: "farm" }),
    ],
  },
  {
    id: "coffee-delivery-ticket",
    version: 1,
    name: "Tiket Penerimaan Kopi",
    description: "Template penerimaan komoditas. Berat harus hasil ukur aktual dan bentuk produk/satuan harus konsisten.",
    category: "rantai_pasok",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "delivery", title: "Penerimaan" }, { id: "measurement", title: "Penimbangan dan pemeriksaan" }],
    fields: [
      field("deliveryTicket", "Nomor tiket penerimaan", "text", { section: "delivery", required: true, maxLength: 100 }),
      field("producerId", "Referensi pemasok/petani", "text", { section: "delivery", required: true, maxLength: 100 }),
      field("deliveryDate", "Tanggal penerimaan", "date", { section: "delivery", required: true }),
      field("productForm", "Bentuk produk", "select", { section: "delivery", required: true, options: ["Cherry", "Gabah", "HS basah", "HS kering", "Green bean", "Roasted bean", "Lainnya"] }),
      field("grossWeight", "Berat kotor aktual", "number", { section: "measurement", min: 0 }),
      field("tareWeight", "Berat tara aktual", "number", { section: "measurement", min: 0 }),
      field("netWeight", "Berat bersih aktual", "number", { section: "measurement", min: 0 }),
      field("unit", "Satuan berat", "select", { section: "measurement", options: ["kg", "g", "ton"] }),
      field("scaleReference", "ID timbangan/kalibrasi", "text", { section: "measurement", maxLength: 120 }),
      field("operator", "Petugas penimbang", "text", { section: "measurement", maxLength: 160 }),
      field("witness", "Saksi (jika ada)", "text", { section: "measurement", maxLength: 160 }),
      field("qualityNote", "Catatan pemeriksaan mutu awal", "textarea", { section: "measurement", maxLength: 2000 }),
    ],
  },
  {
    id: "market-observation",
    version: 1,
    name: "Catatan Harga dan Informasi Pasar",
    description: "Memisahkan harga acuan, penawaran pembeli, harga di tingkat petani dan transaksi yang sudah terealisasi.",
    category: "pasar",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "observation", title: "Informasi pasar" }],
    fields: [
      field("kind", "Jenis data", "select", { section: "observation", required: true, options: ["Benchmark global", "Referensi nasional", "Penawaran pembeli", "Harga petani", "Harga jual terealisasi"] }),
      field("sourceName", "Nama sumber", "text", { section: "observation", required: true, maxLength: 180 }),
      field("sourceUrl", "Tautan sumber", "url", { section: "observation", maxLength: 500 }),
      field("observedAt", "Tanggal/waktu informasi", "date", { section: "observation", required: true }),
      field("commodity", "Komoditas", "text", { section: "observation", required: true, maxLength: 120 }),
      field("grade", "Mutu/grade", "text", { section: "observation", required: true, maxLength: 160 }),
      field("price", "Harga", "number", { section: "observation", min: 0 }),
      field("currency", "Mata uang", "select", { section: "observation", options: ["IDR", "USD", "EUR", "Lainnya"] }),
      field("unit", "Satuan harga", "text", { section: "observation", maxLength: 40 }),
      field("deliveryPoint", "Titik penyerahan", "text", { section: "observation", maxLength: 180 }),
      field("validUntil", "Masa berlaku penawaran", "date", { section: "observation" }),
      field("evidenceId", "Bukti kontrak/faktur/pembayaran (untuk realisasi)", "text", { section: "observation", maxLength: 100 }),
    ],
  },
  {
    id: "activity-evidence-report",
    version: 1,
    name: "Laporan Kegiatan dan Bukti",
    description: "Format pelaporan kegiatan sederhana dengan pemisahan rencana, realisasi, hasil, dan bukti.",
    category: "program",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "activity", title: "Kegiatan" }, { id: "results", title: "Hasil dan bukti" }],
    fields: [
      field("programId", "Referensi program", "text", { section: "activity", required: true }),
      field("activityName", "Nama kegiatan", "text", { section: "activity", required: true, maxLength: 240 }),
      field("plannedDate", "Tanggal rencana", "date", { section: "activity" }),
      field("actualDate", "Tanggal pelaksanaan aktual", "date", { section: "activity" }),
      field("location", "Lokasi", "text", { section: "activity", maxLength: 240 }),
      field("responsiblePerson", "Penanggung jawab", "text", { section: "activity", maxLength: 160 }),
      field("plannedOutput", "Keluaran yang direncanakan", "textarea", { section: "results", maxLength: 2000 }),
      field("actualOutput", "Keluaran aktual yang terlaksana", "textarea", { section: "results", maxLength: 3000 }),
      field("outcomeObservation", "Perubahan/hasil yang diamati", "textarea", { section: "results", maxLength: 3000 }),
      field("evidenceIds", "Referensi bukti kegiatan", "textarea", { section: "results", maxLength: 1500 }),
      field("verificationStatus", "Status pemeriksaan", "select", { section: "results", options: ["Belum diperiksa", "Menunggu verifikasi", "Terverifikasi internal", "Perlu perbaikan"] }),
    ],
  },
  {
    id: "standards-self-assessment",
    version: 1,
    name: "Pemeriksaan Mandiri Standar",
    description: "Template pemeriksaan internal berbasis versi dokumen. Bukan sertifikat atau audit eksternal.",
    category: "mutu",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "control", title: "Kontrol standar" }, { id: "finding", title: "Bukti dan tindakan korektif" }],
    fields: [
      field("scheme", "Nama skema/standar", "text", { section: "control", required: true, maxLength: 180 }),
      field("standardVersion", "Versi dokumen", "text", { section: "control", required: true, maxLength: 80 }),
      field("controlReference", "Nomor butir/kontrol", "text", { section: "control", required: true, maxLength: 120 }),
      field("effectiveDate", "Tanggal berlaku dokumen", "date", { section: "control", required: true }),
      field("applicability", "Penerapan kontrol", "select", { section: "control", options: ["Belum ditentukan", "Berlaku", "Tidak berlaku dengan alasan"] }),
      field("assessmentResult", "Hasil pemeriksaan internal", "select", { section: "control", options: ["Belum diperiksa", "Sesuai bukti", "Perlu perbaikan", "Tidak dapat dinilai"] }),
      field("evidenceId", "Referensi bukti", "text", { section: "finding", maxLength: 100 }),
      field("findingDescription", "Temuan/catatan", "textarea", { section: "finding", maxLength: 3000 }),
      field("correctiveAction", "Tindakan perbaikan", "textarea", { section: "finding", maxLength: 3000 }),
      field("responsiblePerson", "Penanggung jawab perbaikan", "text", { section: "finding", maxLength: 160 }),
      field("dueDate", "Tenggat tindakan korektif", "date", { section: "finding" }),
      field("verifiedBy", "Pemeriksa internal", "text", { section: "finding", maxLength: 160 }),
    ],
  },
  {
    id: "program-indicator-dictionary",
    version: 1,
    name: "Kamus Indikator Program",
    description: "Template definisi indikator, metode, sumber dan satuan. Target boleh kosong sampai ada persetujuan.",
    category: "meal",
    lifecycle: "future_workflow",
    formStatus: "coming_soon",
    sections: [{ id: "indicator", title: "Definisi indikator" }],
    fields: [
      field("indicatorCode", "Kode indikator", "text", { section: "indicator", required: true, maxLength: 80 }),
      field("indicatorName", "Nama indikator", "text", { section: "indicator", required: true, maxLength: 200 }),
      field("resultLevel", "Tingkat hasil", "select", { section: "indicator", options: ["Input", "Output", "Outcome", "Impact"] }),
      field("definition", "Definisi/cara hitung", "textarea", { section: "indicator", required: true, maxLength: 4000 }),
      field("unit", "Satuan", "text", { section: "indicator", maxLength: 80 }),
      field("baseline", "Nilai baseline (bila telah diukur)", "number", { section: "indicator" }),
      field("target", "Target (hanya setelah disepakati)", "number", { section: "indicator" }),
      field("collectionMethod", "Metode pengumpulan", "textarea", { section: "indicator", maxLength: 2000 }),
      field("dataSource", "Sumber data", "text", { section: "indicator", maxLength: 240 }),
      field("verificationMethod", "Metode verifikasi", "textarea", { section: "indicator", maxLength: 2000 }),
      field("approvalReference", "Referensi persetujuan mitra/pengurus", "text", { section: "indicator", maxLength: 120 }),
    ],
  },
]);

export const futureModules = Object.freeze([
  { id: "beneficiary-services", name: "Layanan Penerima Manfaat", area: "Individu & komunitas", status: "coming_soon", description: "Pendaftaran per program, pemeriksaan kelayakan, distribusi layanan, riwayat manfaat dan jalur koreksi data." },
  { id: "farm-registry", name: "Database Petani dan Kebun", area: "Pertanian", status: "coming_soon", description: "Profil produsen, kebun, plot, persetujuan pemetaan, praktik pertanian dan catatan panen." },
  { id: "field-operations", name: "Pendataan Lapangan", area: "Operasional", status: "coming_soon", description: "Formulir HP, kunjungan lapangan, absensi, survei, foto bukti dan sinkronisasi koneksi terbatas." },
  { id: "program-meal", name: "Program, Monitoring & MEAL", area: "Program", status: "coming_soon", description: "Kerangka hasil, baseline, target, realisasi, verifikasi, evaluasi dan laporan mitra." },
  { id: "partner-document-room", name: "Ruang Dokumen Mitra", area: "Kemitraan", status: "coming_soon", description: "Penerimaan panduan, versi dokumen, perjanjian, template, komentar dan riwayat persetujuan." },
  { id: "rainforest-alliance-ims", name: "Kesiapan Rainforest Alliance", area: "Mutu & sertifikasi", status: "coming_soon", description: "Register anggota/kebun, versi standar, IMS, inspeksi internal, temuan dan tindakan korektif." },
  { id: "eudr-readiness", name: "Kesiapan EUDR", area: "Kepatuhan rantai pasok", status: "coming_soon", description: "Kelengkapan asal komoditas, bukti lahan, data lokasi terbatas dan paket informasi untuk pembeli yang berwenang." },
  { id: "coffee-traceability", name: "Ketertelusuran Kopi", area: "Rantai pasok", status: "coming_soon", description: "Tiket timbang, mutu, lot, split/merge, perubahan produk, mass balance, gudang dan pengiriman." },
  { id: "quality-management", name: "Manajemen Mutu & Laboratorium", area: "Mutu produk", status: "coming_soon", description: "Sampling, pengujian, grading, hasil cupping, kalibrasi dan pemeriksaan mutu." },
  { id: "market-intelligence", name: "Intelijen Pasar Nasional & Global", area: "Pasar", status: "coming_soon", description: "Harga acuan, harga nasional, penawaran pembeli, titik serah, tren, dan harga jual terealisasi." },
  { id: "grant-finance-procurement", name: "Anggaran Hibah & Pengadaan", area: "Keuangan", status: "coming_soon", description: "Dana terikat, anggaran per pos, pengadaan, persetujuan, pembayaran dan rekonsiliasi." },
  { id: "impact-reporting", name: "Laporan Dampak & Portal Mitra", area: "Pelaporan", status: "coming_soon", description: "Laporan Indonesia/Inggris, bukti terpilih, redaksi data pribadi, ekspor dan akses peninjau terbatas." },
  { id: "safeguarding-grievance", name: "Perlindungan & Pengaduan", area: "Tata kelola", status: "coming_soon", description: "Jalur pengaduan, kasus terbatas, rujukan, penanganan dan tindak lanjut dengan akses khusus." },
  { id: "offline-mobile", name: "Aplikasi Lapangan Offline", area: "Mobile", status: "coming_soon", description: "Pendataan saat jaringan lemah, antrean sinkronisasi, konflik data dan bukti waktu/lokasi." },
]);


/**
 * Template documentation belongs to the Help Centre. Operational data is entered
 * through the existing domain route; the status records whether its form fields
 * still need an explicit 1:1 mapping before the template can be called complete.
 */
export const templateDestinations = Object.freeze({
  "partner-engagement-log": { route: "/dashboard/kemitraan", label: "Kemitraan", inputStatus: "existing_domain_form" },
  "tot-session-record": { route: "/dashboard/kegiatan", label: "Agenda Kegiatan", inputStatus: "existing_domain_form" },
  "tot-attendance-roster": { route: "/dashboard/kehadiran", label: "Daftar Hadir", inputStatus: "existing_domain_form" },
  "tot-action-plan": { route: "/dashboard/tindaklanjut", label: "Tugas dan Tindak Lanjut", inputStatus: "existing_domain_form" },
  "partner-document-register": { route: "/dashboard/register", label: "Register Dokumen", inputStatus: "existing_domain_form" },
  "program-preparation-checklist": { route: "/dashboard/kemitraan", label: "Kemitraan", inputStatus: "existing_domain_form" },
  "member-intake-basic": { route: "/dashboard/anggota", label: "Keanggotaan", inputStatus: "existing_domain_form" },
});

const validDay = (value) => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

const isMissing = (value) => value === undefined || value === null
  || (typeof value === "string" && value.trim() === "");

export function getOperationalTemplate(templateId) {
  return operationalTemplates.find((item) => item.id === templateId) || null;
}

export function getTemplateSections(templateId) {
  const template = getOperationalTemplate(templateId);
  return template ? template.sections : [];
}

export function getFutureModules() {
  return futureModules.map((item) => ({ ...item, route: null, interactive: false }));
}

/**
 * Validates a draft against a versioned form definition. It does not persist,
 * enrol a beneficiary, activate a program or grant an external claim.
 */
export function validateTemplateDraft(templateId, payload = {}) {
  const template = getOperationalTemplate(templateId);
  if (!template) return { valid: false, status: "unknown_template", errors: [{ field: null, message: "Template tidak ditemukan." }] };
  if (template.formStatus !== "template_ready") {
    return { valid: false, status: "coming_soon", errors: [{ field: null, message: "Alur digital ini belum tersedia. Template hanya menjadi rancangan sampai modul diaktifkan." }] };
  }

  const errors = [];
  const allowed = new Set(template.fields.map((item) => item.key));
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) errors.push({ field: key, message: "Kolom tidak dikenal dalam versi template ini." });
  }

  for (const item of template.fields) {
    const value = payload[item.key];
    if (item.required && isMissing(value)) {
      errors.push({ field: item.key, message: item.label + " wajib diisi." });
      continue;
    }
    if (isMissing(value)) continue;
    if (item.type === "date" && !validDay(value)) {
      errors.push({ field: item.key, message: item.label + " harus berupa tanggal yang valid." });
    }
    if (item.type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number) || item.min !== undefined && number < item.min
        || item.max !== undefined && number > item.max) {
        errors.push({ field: item.key, message: item.label + " berada di luar nilai yang diizinkan." });
      }
    }
    if (item.type === "select" && item.options && !item.options.includes(value)) {
      errors.push({ field: item.key, message: "Pilihan " + item.label + " tidak valid." });
    }
    if (["text", "textarea", "url"].includes(item.type) && typeof value !== "string") {
      errors.push({ field: item.key, message: item.label + " harus berupa teks." });
    }
    if (typeof value === "string" && item.maxLength && value.length > item.maxLength) {
      errors.push({ field: item.key, message: item.label + " terlalu panjang." });
    }
    if (item.type === "url" && value && !/^https?:\/\/\S+$/i.test(value)) {
      errors.push({ field: item.key, message: item.label + " harus berupa tautan http/https." });
    }
  }

  return {
    valid: errors.length === 0,
    status: errors.length ? "needs_correction" : "draft_validated",
    templateId: template.id,
    templateVersion: template.version,
    errors,
    note: "Validasi template tidak sama dengan penyimpanan, persetujuan, atau pengaktifan program.",
  };
}
