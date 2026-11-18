import nodemailer from 'nodemailer';
import {getSiteSettings} from './site-settings';
import {settingImage} from './settings-config';
import {siteOrigin} from './site-origin';

const senderEmail = process.env.GMAIL_USER?.trim().toLowerCase();
const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
const organizationAddress = 'Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah';
const brandLogoUrl = 'https://raw.githubusercontent.com/teknik-informer/Srikandi-Buana/main/public/brand/wordmark.png';

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

async function renderEmail(input: {
  name: string;
  url: string;
  expires: string;
  copy: MailCopy;
}) {
  const site = await getSiteSettings();
  const heroPath = settingImage(site.heroFileId, '/images/pertanian-premium-v1.webp');
  const heroImageUrl = escapeHtml(new URL(heroPath, siteOrigin()).toString());
  const safeName = escapeHtml(input.name || 'Pengguna Srikandi Buana');
  const safeUrl = escapeHtml(input.url);
  const expiry = new Date(input.expires).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  }) + ' WIB';
  const preheader = escapeHtml(input.copy.intro);
  const safeExpiry = escapeHtml(expiry);
  const safeHeading = escapeHtml(input.copy.heading);
  const safeEyebrow = escapeHtml(input.copy.eyebrow);
  const safeIntro = escapeHtml(input.copy.intro);
  const safeAction = escapeHtml(input.copy.action);
  const safeNote = escapeHtml(input.copy.note);

  // Table-first layout and inline styles follow the responsive, email-client-safe
  // construction principles in konsav/email-templates (MIT licensed reference).
  const html = `<!doctype html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(input.copy.subject)}</title>
  <style>
    body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    @media screen and (max-width:620px) {
      .email-shell { width:100% !important; }
      .email-gutter { padding-left:24px !important; padding-right:24px !important; }
      .email-heading { font-size:27px !important; line-height:34px !important; }
      .email-brand { padding:22px 24px !important; }
      .email-body { padding-top:30px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f1f2ed;font-family:Arial,Helvetica,sans-serif;color:#24372e;">
  <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1f2ed" style="width:100%;background-color:#f1f2ed;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:34px 12px 38px;">
        <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
          <tr>
            <td class="email-brand" bgcolor="#234b3d" style="padding:0;background-color:#234b3d;border-radius:14px 14px 0 0;overflow:hidden;">
              <img src="${heroImageUrl}" width="600" height="220" alt="Suasana pertanian pada halaman utama KWT Srikandi Buana" style="display:block;width:100%;max-width:600px;height:220px;object-fit:cover;border:0;outline:none;text-decoration:none;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#315b49" style="width:100%;border-collapse:collapse;background-color:#315b49;background-image:linear-gradient(112deg,#234b3d 0%,#54745d 58%,#8b8050 100%);">
                <tr>
                  <td align="left" valign="middle" style="padding:22px 30px 20px;">
                    <img src="${brandLogoUrl}" width="190" alt="Srikandi Buana — Kelompok Wanita Tani" style="display:block;width:190px;max-width:100%;height:auto;color:#fffdf7;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">
                  </td>
                  <td align="right" valign="middle" style="padding:18px 30px 18px 8px;color:#f0dfb4;font-size:9px;line-height:15px;letter-spacing:1.35px;font-weight:bold;">
                    SISTEM INFORMASI<br>ORGANISASI
                  </td>
                </tr>
                <tr><td colspan="2" style="padding:0 30px 17px;color:#e1e9e2;font-size:10px;line-height:16px;letter-spacing:1.15px;">NGADIMULYO&nbsp;&nbsp;·&nbsp;&nbsp;KEDU&nbsp;&nbsp;·&nbsp;&nbsp;TEMANGGUNG</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e4e7df;border-right:1px solid #e4e7df;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr><td bgcolor="#b88727" style="height:4px;background-color:#b88727;font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td class="email-gutter email-body" style="padding:42px 48px 0;">
                    <p style="margin:0 0 13px;color:#987326;font-size:10px;line-height:15px;letter-spacing:1.7px;font-weight:bold;">${safeEyebrow}</p>
                    <h1 class="email-heading" style="margin:0;color:#123d32;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:40px;font-weight:normal;letter-spacing:-.55px;">${safeHeading}</h1>
                  </td>
                </tr>
                <tr>
                  <td class="email-gutter" style="padding:25px 48px 0;">
                    <p style="margin:0 0 12px;color:#263b31;font-size:15px;line-height:24px;">Yth. <strong style="color:#123d32;">${safeName}</strong>,</p>
                    <p style="margin:0;color:#59675e;font-size:14px;line-height:25px;">${safeIntro}</p>
                  </td>
                </tr>
                <tr>
                  <td class="email-gutter" align="left" style="padding:30px 48px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                      <tr>
                        <td align="center" bgcolor="#174b3b" style="background-color:#174b3b;border-radius:6px;">
                          <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 24px;border:1px solid #174b3b;border-radius:6px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:.15px;text-decoration:none;">${safeAction}&nbsp;&nbsp;&#8594;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-gutter" style="padding:0 48px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f7f7f2" style="width:100%;background-color:#f7f7f2;border:1px solid #e9e8dd;border-left:3px solid #b88727;border-collapse:separate;">
                      <tr>
                        <td style="padding:16px 18px 17px;">
                          <p style="margin:0 0 6px;color:#123d32;font-size:11px;line-height:16px;font-weight:bold;letter-spacing:.65px;">INFORMASI KEAMANAN</p>
                          <p style="margin:0;color:#59675e;font-size:12px;line-height:20px;">Tautan ini berlaku sampai <strong style="color:#263b31;">${safeExpiry}</strong>.</p>
                          <p style="margin:6px 0 0;color:#758077;font-size:11px;line-height:18px;">${safeNote}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-gutter" style="padding:0 48px 30px;">
                    <p style="margin:0 0 8px;color:#7a857d;font-size:11px;line-height:18px;">Jika tombol tidak dapat dibuka, salin tautan berikut ke browser:</p>
                    <p style="margin:0;color:#37664f;font-size:11px;line-height:19px;word-break:break-all;"><a href="${safeUrl}" target="_blank" style="color:#37664f;text-decoration:underline;word-break:break-all;">${safeUrl}</a></p>
                  </td>
                </tr>
                <tr><td class="email-gutter" style="padding:0 48px;"><div style="height:1px;background-color:#e9ece6;font-size:0;line-height:0;">&nbsp;</div></td></tr>
                <tr>
                  <td class="email-gutter" style="padding:23px 48px 35px;">
                    <p style="margin:0;color:#66736a;font-size:11px;line-height:19px;">Demi keamanan, jangan teruskan email ini kepada orang lain. Jika Anda tidak mengenali aktivitas tersebut, abaikan pesan ini.</p>
                    <p style="margin:17px 0 0;color:#123d32;font-size:12px;line-height:19px;font-weight:bold;">Hormat kami,</p>
                    <p style="margin:2px 0 0;color:#123d32;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:23px;font-weight:bold;">KWT Srikandi Buana</p>
                    <p style="margin:5px 0 0;color:#7a857d;font-size:10px;line-height:17px;">${organizationAddress}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#315b49" style="padding:18px 24px 20px;background-color:#315b49;background-image:linear-gradient(112deg,#234b3d 0%,#456b54 58%,#7d7950 100%);border-radius:0 0 14px 14px;">
              <p style="margin:0;color:#e6ddc7;font-size:10px;line-height:17px;letter-spacing:.35px;">SRIKANDI BUANA&nbsp;&nbsp;·&nbsp;&nbsp;TUMBUH BERSAMA, BERDAYA BERSAMA</p>
              <p style="margin:5px 0 0;color:#b7c7bc;font-size:10px;line-height:16px;">Pesan otomatis dari Sistem Informasi Srikandi Buana. Mohon tidak membalas email ini.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = [
    'SRIKANDI BUANA | KELOMPOK WANITA TANI',
    organizationAddress,
    '',
    input.copy.eyebrow,
    input.copy.heading,
    '',
    'Yth. ' + input.name + ',',
    input.copy.intro,
    '',
    input.copy.action + ': ' + input.url,
    '',
    'INFORMASI KEAMANAN',
    'Tautan berlaku sampai: ' + expiry,
    input.copy.note,
    '',
    'Demi keamanan, jangan teruskan email ini kepada orang lain.',
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
  const rendered = await renderEmail({ name: input.name, url: input.url, expires: input.expires, copy });
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
    subject: 'Pratinjau identitas email | KWT Srikandi Buana',
    eyebrow: 'PRATINJAU IDENTITAS EMAIL',
    heading: 'Identitas organisasi, hadir dengan lebih baik',
    intro: 'Pratinjau ini digunakan untuk menilai konsistensi logo, warna, tata letak, dan keterbacaan email resmi Srikandi Buana.',
    action: 'Contoh tombol tindakan',
    note: 'Ini hanya email pratinjau. Tombol contoh tidak menjalankan tindakan akun apa pun.',
  };
  const rendered = await renderEmail({
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
