import nodemailer from 'nodemailer';

const senderEmail = process.env.GMAIL_USER?.trim().toLowerCase();
const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

export type AccountMailPurpose = 'activate' | 'reset' | 'change_email';

export async function sendAccountEmail(input: {
  to: string;
  name: string;
  url: string;
  expires: string;
  purpose: AccountMailPurpose;
}) {
  if (!senderEmail || !appPassword) {
    throw new Error('Layanan email belum dikonfigurasi. Hubungi Arsitek Sistem.');
  }
  if (!/^kwt\.srikandibuana@gmail\.com$/i.test(senderEmail)) {
    throw new Error('Alamat pengirim Gmail tidak sesuai konfigurasi resmi Srikandi Buana.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: appPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const labels: Record<AccountMailPurpose, { subject: string; heading: string; action: string; intro: string }> = {
    activate: { subject: 'Aktivasi akun — KWT Srikandi Buana', heading: 'Aktivasi akun Srikandi Buana', action: 'Aktifkan akun', intro: 'Anda menerima undangan untuk mengakses sistem informasi KWT Srikandi Buana.' },
    reset: { subject: 'Pemulihan akses akun — KWT Srikandi Buana', heading: 'Pemulihan akses akun', action: 'Atur ulang kata sandi', intro: 'Permintaan pemulihan akses akun Srikandi Buana telah dibuat.' },
    change_email: { subject: 'Verifikasi email baru — KWT Srikandi Buana', heading: 'Verifikasi alamat email baru', action: 'Verifikasi email baru', intro: 'Selesaikan verifikasi untuk menggunakan alamat email ini sebagai email login Srikandi Buana.' },
  };
  const content = labels[input.purpose];
  const safeName = escapeHtml(input.name || 'Pengguna Srikandi Buana');
  const safeUrl = escapeHtml(input.url);
  const expiry = new Date(input.expires).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }) + ' WIB';
  const text = [
    content.heading, '', 'Yth. ' + input.name + ',', content.intro, '',
    content.action + ': ' + input.url, '', 'Tautan berlaku sampai ' + expiry + '.',
    'Jika Anda tidak merasa meminta email ini, abaikan pesan ini dan hubungi pengelola Srikandi Buana.',
    '', 'KWT Srikandi Buana', 'Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung',
  ].join('\n');
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#f5f7f2;padding:32px 12px;font-family:Arial,sans-serif;color:#1f2937"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden"><tr><td style="padding:24px 28px;background:#174b35;color:#fff"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#d9e9d7">KWT Srikandi Buana</div><h1 style="font-size:22px;margin:10px 0 0">${content.heading}</h1></td></tr><tr><td style="padding:28px"><p>Yth. <strong>${safeName}</strong>,</p><p style="line-height:1.65">${content.intro}</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#2f704d;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">${content.action}</a></p><p style="font-size:13px;color:#4b5563;line-height:1.6">Tautan ini hanya dapat digunakan satu kali dan berlaku sampai <strong>${expiry}</strong>.</p><p style="font-size:12px;color:#6b7280;line-height:1.6">Jika tombol tidak dapat dibuka, salin tautan berikut ke browser:<br><a href="${safeUrl}" style="color:#2563eb;word-break:break-all">${safeUrl}</a></p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#6b7280;line-height:1.6">Jika Anda tidak merasa meminta email ini, abaikan pesan ini dan hubungi pengelola Srikandi Buana.</p><p style="font-size:13px;margin-bottom:0"><strong>KWT Srikandi Buana</strong><br>Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung</p></td></tr></table></td></tr></table></body></html>`;

  await transporter.sendMail({
    from: { name: 'KWT Srikandi Buana', address: senderEmail },
    to: input.to,
    replyTo: senderEmail,
    subject: content.subject,
    text,
    html,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function sendAccountEmailTest() {
  if (!senderEmail || !appPassword || !/^kwt\.srikandibuana@gmail\.com$/i.test(senderEmail)) {
    throw new Error('Konfigurasi Gmail belum lengkap atau tidak sesuai alamat resmi.');
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: appPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  await transporter.sendMail({
    from: { name: 'KWT Srikandi Buana', address: senderEmail },
    to: senderEmail,
    replyTo: senderEmail,
    subject: 'Uji layanan email — KWT Srikandi Buana',
    text: 'Pengiriman email uji berhasil. Gmail SMTP siap digunakan untuk aktivasi dan pemulihan akun Srikandi Buana.',
    html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#1f2937"><h2 style="color:#174b35">Email operasional terhubung</h2><p>Pengiriman email uji berhasil. Gmail SMTP siap digunakan untuk aktivasi dan pemulihan akun Srikandi Buana.</p><p style="font-size:12px;color:#6b7280">Pesan otomatis dari sistem Srikandi Buana.</p></div>',
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
