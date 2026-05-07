import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notification/notification.service';
import { Role, NotificationType } from '@prisma/client';
import { ReportFraudDto } from './dto/report-fraud.dto';
import { ContactSupportDto } from './dto/contact-support.dto';

const SUPPORT_INBOX = 'steelmaxima21@gmail.com';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private transporter: Transporter | null = null;

  constructor(
    private db: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const userEmail = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !userEmail || !pass) {
      this.logger.warn(
        'SMTP env vars missing (SMTP_HOST/SMTP_USER/SMTP_PASS) — emails will be logged only.',
      );
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: userEmail, pass },
    });
    return this.transporter;
  }

  private async sendMail(args: {
    subject: string;
    text: string;
    replyTo?: string;
  }) {
    const transporter = this.getTransporter();
    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@tappay.local';

    if (!transporter) {
      this.logger.log(
        `[mail-stub] to=${SUPPORT_INBOX} subject="${args.subject}"\n${args.text}`,
      );
      return;
    }

    try {
      await transporter.sendMail({
        from,
        to: SUPPORT_INBOX,
        subject: args.subject,
        text: args.text,
        replyTo: args.replyTo,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${SUPPORT_INBOX}`,
        (err as Error).stack,
      );
    }
  }

  async reportFraud(userId: string, dto: ReportFraudDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const report = await this.db.fraudReport.create({
      data: {
        userId,
        subject: dto.subject,
        description: dto.description,
        ...(dto.transactionReference && {
          transactionReference: dto.transactionReference,
        }),
      },
    });

    const admins = await this.db.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notifications.createAndPush({
          userId: admin.id,
          title: 'New Fraud Report',
          body: `${user.name} reported: ${dto.subject}`,
          type: NotificationType.ALERT,
          metaData: {
            fraudReportId: report.id,
            reporterId: user.id,
            transactionReference: dto.transactionReference ?? null,
          },
        }),
      ),
    );

    await this.sendMail({
      subject: `[TapPay Fraud Report] ${dto.subject}`,
      replyTo: user.email,
      text: [
        `New fraud report submitted.`,
        ``,
        `Reporter: ${user.name} (${user.email}, ${user.phone})`,
        `User ID: ${user.id}`,
        `Transaction reference: ${dto.transactionReference ?? '(none)'}`,
        ``,
        `Subject: ${dto.subject}`,
        ``,
        `Description:`,
        dto.description,
        ``,
        `Report ID: ${report.id}`,
      ].join('\n'),
    });

    return {
      message:
        'Fraud report submitted. Our team will contact you within 24 hours.',
    };
  }

  async contact(userId: string, dto: ContactSupportDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    await this.sendMail({
      subject: `[TapPay Support] ${dto.subject}`,
      replyTo: user.email,
      text: [
        `Channel: ${dto.type}`,
        ``,
        `From: ${user.name} <${user.email}>`,
        `Phone: ${user.phone}`,
        `User ID: ${user.id}`,
        ``,
        `Subject: ${dto.subject}`,
        ``,
        `Message:`,
        dto.message,
      ].join('\n'),
    });

    return {
      message: "Your message has been sent. We'll respond within 2 hours.",
    };
  }
}
