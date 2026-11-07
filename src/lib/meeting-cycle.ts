export const meetingReviewStatuses = [
  "Belum dievaluasi",
  "Sesuai keputusan",
  "Sebagian terlaksana",
  "Belum terlaksana",
  "Perlu perubahan mandat",
] as const;

export type MeetingReviewStatus = (typeof meetingReviewStatuses)[number];

export function parseMeetingActions(value: unknown): string[] {
  return String(value || "")
    .split("\n")
    .map((line) => line
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .trim()
      .slice(0, 500))
    .filter(Boolean)
    .slice(0, 30);
}

export function meetingActionSourceMarker(meetingId: string, index: number): string {
  return "Sumber rapat: " + meetingId + " · Keputusan #" + (index + 1) + ":";
}

export function parseMeetingTaskReference(value: unknown): {
  meetingId: string;
  decisionNumber: number;
  marker: string;
} | null {
  const notes = String(value || "");
  const match = notes.match(/Sumber rapat: ([^·]+) · Keputusan #(\d+):/);
  if (!match) return null;
  const meetingId = match[1].trim();
  const decisionNumber = Number(match[2]);
  if (!meetingId || !Number.isSafeInteger(decisionNumber) || decisionNumber < 1) return null;
  return {
    meetingId,
    decisionNumber,
    marker: meetingActionSourceMarker(meetingId, decisionNumber - 1),
  };
}

export function decisionsPreserveExistingOrder(previous: unknown, next: unknown): boolean {
  const before = parseMeetingActions(previous);
  const after = parseMeetingActions(next);
  return after.length >= before.length &&
    before.every((decision, index) => decision === after[index]);
}

export function meetingReviewError(input: {
  role: string;
  previousStatus?: string;
  previousMeeting?: string;
  previousDate?: string;
  previousNote?: string;
  status: string;
  meeting: string;
  date: string;
  note: string;
}): string | null {
  const validStatus = meetingReviewStatuses.includes(input.status as MeetingReviewStatus);
  if (!validStatus) return "Status evaluasi keputusan rapat tidak valid.";

  const previous = {
    status: input.previousStatus || "Belum dievaluasi",
    meeting: input.previousMeeting || "",
    date: input.previousDate || "",
    note: input.previousNote || "",
  };
  const next = {
    status: input.status,
    meeting: input.meeting.trim(),
    date: input.date,
    note: input.note.trim(),
  };
  const changed =
    previous.status !== next.status ||
    previous.meeting !== next.meeting ||
    previous.date !== next.date ||
    previous.note !== next.note;

  if (!changed) return null;
  if (input.role !== "admin" && input.role !== "ketua") {
    return "Hanya Ketua atau Administrator yang dapat mengevaluasi keputusan rapat.";
  }
  if (next.status !== "Belum dievaluasi") {
    if (!next.meeting) return "Isi judul atau nomor rapat yang melakukan evaluasi.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || !Number.isFinite(Date.parse(next.date + "T00:00:00.000Z")) || new Date(next.date + "T00:00:00.000Z").toISOString().slice(0, 10) !== next.date) return "Isi tanggal rapat evaluasi yang valid.";
    if (!next.note) return "Catat hasil evaluasi dan alasan keputusan.";
  }
  return null;
}
