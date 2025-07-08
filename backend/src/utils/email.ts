import { log } from './logger';
import sgMail from '@sendgrid/mail';

// SendGrid APIキーの設定
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// メール送信の基本関数
export async function sendEmail(options: EmailOptions): Promise<void> {
  log.info('Sending email', {
    to: options.to,
    subject: options.subject,
  });

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
    console.log('\n=== Email Preview ===');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Content: ${options.text || 'HTML content'}`);
    console.log('====================\n');
    return;
  }

  // SendGridでメール送信
  if (process.env.SENDGRID_API_KEY) {
    try {
      const msg = {
        to: options.to,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@example.com',
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      };

      await sgMail.send(msg);
      log.info('Email sent successfully', { to: options.to });
    } catch (error) {
      log.error('Failed to send email', error);
      throw new Error('Failed to send email');
    }
  } else {
    log.warn('Email not sent: SENDGRID_API_KEY not configured');
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // SendGridテンプレートを使用する場合
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_VERIFICATION_TEMPLATE_ID) {
    try {
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@example.com',
        templateId: process.env.SENDGRID_VERIFICATION_TEMPLATE_ID,
        dynamicTemplateData: {
          name: name,
          verification_url: verificationUrl,
        },
      };

      await sgMail.send(msg);
      log.info('Verification email sent successfully', { to: email });
      return;
    } catch (error) {
      log.error('Failed to send verification email with template', error);
      // テンプレート送信に失敗した場合は通常のメールで送信
    }
  }

  // 通常のHTMLメール送信
  const html = `
    <h1>メールアドレスの確認</h1>
    <p>こんにちは、${name}さん</p>
    <p>ご登録ありがとうございます。以下のボタンをクリックしてメールアドレスを確認してください。</p>
    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #206bc4; color: white; text-decoration: none; border-radius: 5px;">メールアドレスを確認</a>
    <p>このリンクは24時間有効です。</p>
    <p>心当たりがない場合は、このメールを無視してください。</p>
  `;

  const text = `
    メールアドレスの確認

    こんにちは、${name}さん

    ご登録ありがとうございます。以下のURLにアクセスしてメールアドレスを確認してください。

    ${verificationUrl}

    このリンクは24時間有効です。
    心当たりがない場合は、このメールを無視してください。
  `;

  await sendEmail({
    to: email,
    subject: '【ナンバーズ4予想サイト】メールアドレスの確認',
    html,
    text,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <h1>パスワードリセット</h1>
    <p>こんにちは、${name}さん</p>
    <p>パスワードリセットのリクエストを受け付けました。以下のボタンをクリックして新しいパスワードを設定してください。</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #206bc4; color: white; text-decoration: none; border-radius: 5px;">パスワードをリセット</a>
    <p>このリンクは1時間有効です。</p>
    <p>心当たりがない場合は、このメールを無視してください。パスワードは変更されません。</p>
  `;

  const text = `
    パスワードリセット

    こんにちは、${name}さん

    パスワードリセットのリクエストを受け付けました。以下のURLにアクセスして新しいパスワードを設定してください。

    ${resetUrl}

    このリンクは1時間有効です。
    心当たりがない場合は、このメールを無視してください。パスワードは変更されません。
  `;

  await sendEmail({
    to: email,
    subject: '【ナンバーズ4予想サイト】パスワードリセット',
    html,
    text,
  });
}

export async function sendSubscriptionConfirmationEmail(
  email: string,
  name: string,
  planName: string
): Promise<void> {
  const html = `
    <h1>サブスクリプション登録完了</h1>
    <p>こんにちは、${name}さん</p>
    <p>${planName}プランへのご登録ありがとうございます。</p>
    <p>これより最新の予想をご覧いただけます。</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #206bc4; color: white; text-decoration: none; border-radius: 5px;">ダッシュボードへ</a>
    <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
  `;

  const text = `
    サブスクリプション登録完了

    こんにちは、${name}さん

    ${planName}プランへのご登録ありがとうございます。
    これより最新の予想をご覧いただけます。

    ダッシュボード: ${process.env.FRONTEND_URL}/dashboard

    ご不明な点がございましたら、お気軽にお問い合わせください。
  `;

  await sendEmail({
    to: email,
    subject: '【ナンバーズ4予想サイト】サブスクリプション登録完了',
    html,
    text,
  });
}

export async function sendPredictionNotificationEmail(
  email: string,
  name: string,
  drawNumber: number
): Promise<void> {
  const html = `
    <h1>新しい予想が公開されました</h1>
    <p>こんにちは、${name}さん</p>
    <p>第${drawNumber}回の予想が公開されました。</p>
    <p>データ分析とAIによる最新の予想をぜひご確認ください。</p>
    <a href="${process.env.FRONTEND_URL}/predictions/latest" style="display: inline-block; padding: 10px 20px; background-color: #2fb344; color: white; text-decoration: none; border-radius: 5px;">最新の予想を見る</a>
    <p>幸運を祈ります！</p>
  `;

  const text = `
    新しい予想が公開されました

    こんにちは、${name}さん

    第${drawNumber}回の予想が公開されました。
    データ分析とAIによる最新の予想をぜひご確認ください。

    最新の予想: ${process.env.FRONTEND_URL}/predictions/latest

    幸運を祈ります！
  `;

  await sendEmail({
    to: email,
    subject: `【ナンバーズ4予想サイト】第${drawNumber}回の予想が公開されました`,
    html,
    text,
  });
}