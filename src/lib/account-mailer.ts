import nodemailer from 'nodemailer';

const senderEmail = process.env.GMAIL_USER?.trim().toLowerCase();
const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
const organizationAddress = 'Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

export type AccountMailPurpose = 'activate' | 'reset' | 'change_email';

type MailCopy = {
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  action: string;
  note: string;
};

const mailCopy: Record<AccountMailPurpose, MailCopy> = {
  activate: {
    subject: 'Undangan akses | KWT Srikandi Buana',
    eyebrow: 'UNDANGAN AKSES RESMI',
    heading: 'Selamat datang di Srikandi Buana',
    intro: 'Akses sistem informasi organisasi Anda telah disiapkan. Selesaikan aktivasi untuk mulai menggunakan akun dengan aman.',
    action: 'Aktifkan akun',
    note: 'Tautan aktivasi hanya dapat digunakan satu kali.',
  },
  reset: {
    subject: 'Pemulihan akses akun | KWT Srikandi Buana',
    eyebrow: 'KEAMANAN AKUN',
    heading: 'Pulihkan akses akun Anda',
    intro: 'Kami menerima permintaan untuk mengatur ulang kata sandi akun Srikandi Buana. Gunakan tombol di bawah ini untuk melanjutkan.',
    action: 'Atur ulang kata sandi',
    note: 'Jika Anda tidak mengajukan permintaan ini, abaikan email ini. Kata sandi Anda tidak akan berubah.',
  },
  change_email: {
    subject: 'Konfirmasi alamat email | KWT Srikandi Buana',
    eyebrow: 'KONFIRMASI ALAMAT EMAIL',
    heading: 'Satu langkah lagi',
    intro: 'Konfirmasikan alamat email ini untuk menjadikannya alamat masuk akun Srikandi Buana Anda.',
    action: 'Konfirmasi email',
    note: 'Alamat email akun belum berubah sampai konfirmasi ini berhasil diselesaikan.',
  },
};

function renderEmail(input: {
  name: string;
  url: string;
  expires: string;
  copy: MailCopy;
}) {
  const safeName = escapeHtml(input.name || 'Pengguna Srikandi Buana');
  const safeUrl = escapeHtml(input.url);
  const expiry = new Date(input.expires).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  }) + ' WIB';
  const preheader = escapeHtml(input.copy.intro);
  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(input.copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#243329;-webkit-text-size-adjust:100%;">
  <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f0;">
    <tr><td align="center" style="padding:36px 14px 42px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;">
        <tr><td style="padding:0 8px 18px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="middle" style="width:42px;height:42px;border-radius:12px;background-color:#174b35;text-align:center;color:#e7d39a;font-family:Georgia,serif;font-size:22px;font-weight:bold;">S</td>
              <td valign="middle" style="padding-left:12px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:22px;font-weight:bold;letter-spacing:.2px;color:#174b35;">Srikandi Buana</div>
                <div style="padding-top:3px;font-size:9px;line-height:13px;letter-spacing:1.7px;color:#8a7440;">KELOMPOK WANITA TANI</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#ffffff;border:1px solid #e4e9df;border-radius:18px;overflow:hidden;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="height:5px;background-color:#b69a55;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="padding:38px 42px 12px;">
              <div style="font-size:10px;line-height:16px;letter-spacing:1.8px;font-weight:bold;color:#9a8044;">${input.copy.eyebrow}</div>
              <h1 style="margin:13px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.22;font-weight:normal;letter-spacing:-.35px;color:#173f2d;">${escapeHtml(input.copy.heading)}</h1>
            </td></tr>
            <tr><td style="padding:12px 42px 0;">
              <p style="margin:0 0 12px;font-size:15px;line-height:25px;color:#33443a;">Yth. <strong style="color:#173f2d;">${safeName}</strong>,</p>
              <p style="margin:0;font-size:14px;line-height:25px;color:#59665d;">${escapeHtml(input.copy.intro)}</p>
            </td></tr>
            <tr><td align="left" style="padding:30px 42px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr><td align="center" bgcolor="#1d583d" style="border-radius:8px;">
                  <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 25px;border:1px solid #1d583d;border-radius:8px;background-color:#1d583d;color:#ffffff;text-decoration:none;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:.2px;">${escapeHtml(input.copy.action)} &nbsp; &#8594;</a>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:0 42px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f7f8f4;border:1px solid #e8ece4;border-radius:10px;">
                <tr><td style="padding:16px 18px;">
                  <div style="font-size:11px;line-height:17px;font-weight:bold;color:#31483a;">Batas waktu keamanan</div>
                  <div style="padding-top:4px;font-size:13px;line-height:20px;color:#526056;">Tautan berlaku sampai <strong style="color:#243b2d;">${escapeHtml(expiry)}</strong>.</div>
                  <div style="padding-top:7px;font-size:11px;line-height:17px;color:#7a847c;">${escapeHtml(input.copy.note)}</div>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:0 42px 30px;">
              <p style="margin:0 0 8px;font-size:11px;line-height:18px;color:#7b857d;">Jika tombol tidak dapat dibuka, salin dan tempel tautan berikut ke browser:</p>
              <p style="margin:0;font-size:11px;line-height:18px;word-break:break-all;"><a href="${safeUrl}" style="color:#386b50;text-decoration:underline;">${safeUrl}</a></p>
            </td></tr>
            <tr><td style="padding:0 42px;"><div style="height:1px;background-color:#e9ede7;font-size:0;line-height:0;">&nbsp;</div></td></tr>
            <tr><td style="padding:22px 42px 30px;">
              <p style="margin:0;font-size:12px;line-height:20px;color:#6d786f;">Demi keamanan, jangan teruskan email ini kepada orang lain. Jika Anda tidak mengenali aktivitas tersebut, Anda dapat mengabaikan pesan ini.</p>
              <p style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:21px;font-weight:bold;color:#174b35;">KWT Srikandi Buana</p>
              <p style="margin:4px 0 0;font-size:11px;line-height:18px;color:#7b857d;">${organizationAddress}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 14px 0;">
          <p style="margin:0;font-size:10px;line-height:17px;letter-spacing:.2px;color:#899289;">Pesan otomatis dari Sistem Informasi Srikandi Buana.</p>
          <p style="margin:4px 0 0;font-size:10px;line-height:17px;color:#a0a89f;">Mohon tidak membalas email ini.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [
    'SRIKANDI BUANA | KELOMPOK WANITA TANI',
    input.copy.eyebrow,
    '',
    input.copy.heading,
    '',
    'Yth. ' + input.name + ',',
    input.copy.intro,
    '',
    input.copy.action + ': ' + input.url,
    '',
    'Batas waktu: ' + expiry,
    input.copy.note,
    '',
    'Jika Anda tidak mengenali aktivitas tersebut, abaikan pesan ini.',
    '',
    'KWT Srikandi Buana',
    organizationAddress,
    '',
    'Pesan otomatis dari Sistem Informasi Srikandi Buana.',
  ].join('\n');
  return { html, text, expiry };
}

function createTransporter() {
  if (!senderEmail || !appPassword) {
    throw new Error('Layanan email belum dikonfigurasi. Hubungi Arsitek Sistem.');
  }
  if (!/^kwt\.srikandibuana@gmail\.com$/i.test(senderEmail)) {
    throw new Error('Alamat pengirim Gmail tidak sesuai konfigurasi resmi Srikandi Buana.');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: senderEmail, pass: appPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

export async function sendAccountEmail(input: {
  to: string;
  name: string;
  url: string;
  expires: string;
  purpose: AccountMailPurpose;
}) {
  const transporter = createTransporter();
  const copy = mailCopy[input.purpose];
  const rendered = renderEmail({ name: input.name, url: input.url, expires: input.expires, copy });
  await transporter.sendMail({
    from: { name: 'KWT Srikandi Buana', address: senderEmail! },
    to: input.to,
    replyTo: senderEmail!,
    subject: copy.subject,
    text: rendered.text,
    html: rendered.html,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function sendAccountEmailTest() {
  const transporter = createTransporter();
  const copy: MailCopy = {
    subject: 'Pratinjau desain email | KWT Srikandi Buana',
    eyebrow: 'PRATINJAU DESAIN EMAIL',
    heading: 'Identitas digital yang tertata',
    intro: 'Ini adalah email pratinjau untuk memeriksa tampilan visual, keterbacaan, dan konsistensi identitas email resmi Srikandi Buana.',
    action: 'Contoh tombol tindakan',
    note: 'Ini hanya email pratinjau. Tombol contoh tidak menjalankan tindakan apa pun.',
  };
  const rendered = renderEmail({
    name: 'Pengelola Srikandi Buana',
    url: 'https://example.com/pratinjau-email',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    copy,
  });
  await transporter.sendMail({
    from: { name: 'KWT Srikandi Buana', address: senderEmail! },
    to: senderEmail!,
    replyTo: senderEmail!,
    subject: copy.subject,
    text: rendered.text,
    html: rendered.html,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
