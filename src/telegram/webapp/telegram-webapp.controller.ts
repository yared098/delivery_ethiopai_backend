import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Res,
  UnauthorizedException,
  BadRequestException,
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { TelegramWebAppService } from './telegram-webapp.service';
import { WebAppCreateOrderDto } from './telegram-webapp.dto';
import { OrdersService } from '../../orders/orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { AccountType, PaymentParty } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Public()
@Controller('telegram/webapp')
export class TelegramWebAppController {
  private readonly logger = new Logger(TelegramWebAppController.name);

  constructor(
    private readonly webApp: TelegramWebAppService,
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  // ══════════════════════════════════════════════════
  // HTML MINI APP FORM
  // Served at GET /api/v1/telegram/webapp/order-form
  // Telegram opens this URL as a Web App inside the bot.
  // ══════════════════════════════════════════════════
  // @Get('order-form')
  // serveForm(@Res() res: Response): void {
  //   const apiBase = this.webApp.webAppUrl;
  //   const html = buildOrderFormHtml(apiBase);
  //   res.setHeader('Content-Type', 'text/html; charset=utf-8');
  //   res.send(html);
  // } 
   @Get('order-form')
  serveForm(@Res() res: Response): void {
    const target = this.webApp.orderFormUrl;
    this.logger.log(`Redirecting /order-form → ${target}`);
    res.redirect(302, target);
  }

  // ══════════════════════════════════════════════════
  // CREATE ORDER via Mini App
  // POST /api/v1/telegram/webapp/create-order
  // Authorization: tma <initData>
  // ══════════════════════════════════════════════════
  @Post('create-order')
  async createOrder(
    @Headers('authorization') authHeader: string,
    @Body() body: unknown,
  ) {
    // 1. Validate Telegram initData
    if (!authHeader?.startsWith('tma ')) {
      throw new UnauthorizedException('Missing Telegram authorization header');
    }
    const initData = authHeader.slice(4).trim();
    const tgUser = this.webApp.validateInitData(initData);

    // 2. Find the linked customer
    const customer = await this.prisma.customer.findFirst({
      where: { telegramId: tgUser.telegramId },
    });
    if (!customer) {
      throw new UnauthorizedException(
        'Your Telegram is not linked to a Deliver Ethiopia account. Open the bot and type /register first.',
      );
    }
    if (!customer.isActive) {
      throw new UnauthorizedException('Your account is suspended.');
    }

    // 3. Validate body DTO
    const dto = plainToInstance(WebAppCreateOrderDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      throw new BadRequestException(messages);
    }

    // 4. Build CreateOrderDto and call orders service
    const orderDto: any = {
      sender: {
        customerId: customer.id,
        name: customer.name ?? tgUser.first_name ?? 'Customer',
        phone: customer.phone,
        address: dto.senderAddress ?? customer.defaultAddress ?? undefined,
        lat: dto.senderLat ?? customer.defaultLat ?? undefined,
        lng: dto.senderLng ?? customer.defaultLng ?? undefined,
      },
      paymentParty:
        dto.paymentParty === 'RECEIVER'
          ? PaymentParty.RECEIVER
          : PaymentParty.SENDER,
      sendReceiverLink: Boolean(dto.receiverName && dto.receiverPhone),
      autoAssignCourier: false,
    };

    // Only include receiver if provided
    if (dto.receiverName || dto.receiverPhone) {
      orderDto.receiver = {
        name: dto.receiverName ?? 'Receiver',
        phone: dto.receiverPhone ?? '',
      };
    }

    // Only include items if item description and weight are provided
    if (dto.itemDescription && dto.weightKg) {
      orderDto.items = [
        {
          description: dto.itemDescription,
          weightKg: dto.weightKg,
          quantity: 1,
          photoUrl: dto.photoUrl,
        },
      ];
    }

    const actor = {
      id: customer.id,
      name: customer.name ?? 'Customer',
      accountType: AccountType.CUSTOMER,
      role: 'CUSTOMER',
    };

    try {
      const result = await this.orders.create(orderDto, actor);
      const order = result.order;
      if (!order) {
        throw new BadRequestException('Order creation failed: order not persisted');
      }
      return {
        success: true,
        trackingNumber: order.trackingNumber,
        deliveryFee: order.deliveryFee,
        status: order.status,
        message:
          `Order created! Tracking: ${order.trackingNumber}. ` +
          `The receiver will get a link to share the drop-off location.`,
      };
    } catch (err: unknown) {
      this.logger.error(
        `WebApp order creation failed for customer ${customer.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Order creation failed',
      );
    }
  }

  // ═══════════════════════════════════════════════════
  // UPLOAD PHOTO via Mini App
  // POST /api/v1/telegram/webapp/uploads
  // Authorization: tma <initData>
  // ═══════════════════════════════════════════════════
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads', 'orders');
          mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPEG, PNG, WebP allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadPhoto(
    @Headers('authorization') authHeader: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 1. Validate Telegram initData
    if (!authHeader?.startsWith('tma ')) {
      throw new UnauthorizedException('Missing Telegram authorization header');
    }
    const initData = authHeader.slice(4).trim();
    const tgUser = this.webApp.validateInitData(initData);

    // 2. Find the linked customer
    const customer = await this.prisma.customer.findFirst({
      where: { telegramId: tgUser.telegramId },
    });
    if (!customer) {
      throw new UnauthorizedException(
        'Your Telegram is not linked to a Deliver Ethiopia account.',
      );
    }
    if (!customer.isActive) {
      throw new UnauthorizedException('Your account is suspended.');
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(
      `Photo uploaded for customer ${customer.id}: ${file.filename}`,
    );

    return {
      url: `/uploads/orders/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}

// ══════════════════════════════════════════════════
// SELF-CONTAINED HTML MINI APP
// ══════════════════════════════════════════════════
function buildOrderFormHtml(apiBase: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Create Order — Deliver Ethiopia</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root {
      --bg: var(--tg-theme-bg-color, #fff);
      --fg: var(--tg-theme-text-color, #111);
      --hint: var(--tg-theme-hint-color, #888);
      --link: var(--tg-theme-link-color, #2481cc);
      --btn: var(--tg-theme-button-color, #2481cc);
      --btn-fg: var(--tg-theme-button-text-color, #fff);
      --input-bg: var(--tg-theme-secondary-bg-color, #f1f1f1);
      --radius: 12px;
      --gap: 14px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      padding: 16px;
      min-height: 100vh;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: var(--gap);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section {
      background: var(--input-bg);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: var(--gap);
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--hint);
      margin-bottom: 10px;
    }
    label {
      display: block;
      font-size: 13px;
      color: var(--hint);
      margin-bottom: 4px;
    }
    input, select, textarea {
      display: block;
      width: 100%;
      background: var(--bg);
      color: var(--fg);
      border: 1.5px solid transparent;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 15px;
      outline: none;
      margin-bottom: 10px;
      transition: border-color 0.15s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--link);
    }
    input:last-child, select:last-child, textarea:last-child { margin-bottom: 0; }
    textarea { resize: vertical; min-height: 72px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .row > div { display: flex; flex-direction: column; }

    /* Location row */
    .location-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .location-status {
      flex: 1;
      font-size: 13px;
      color: var(--hint);
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .location-status.ok { color: #22c55e; }
    .location-status.err { color: #ef4444; }
    button.loc-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--btn);
      color: var(--btn-fg);
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    button.loc-btn:disabled { opacity: 0.5; cursor: default; }

    /* Photo upload */
    .photo-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .photo-label input[type=file] { display: none; }
    .photo-label .photo-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--btn);
      color: var(--btn-fg);
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 600;
    }
    #photoName {
      font-size: 13px;
      color: var(--hint);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #photoPreview {
      width: 100%;
      max-height: 160px;
      object-fit: contain;
      border-radius: 8px;
      margin-top: 10px;
      display: none;
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,.78);
      color: #fff;
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 999;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      max-width: 90vw;
      text-align: center;
    }
    #toast.show { opacity: 1; }

    /* Bottom safe area */
    .spacer { height: 32px; }
  </style>
</head>
<body>
  <h2>📦 New Order</h2>

  <!-- RECEIVER (optional) -->
  <div class="section">
    <div class="section-title">Receiver (optional — fill later if you want)</div>
    <label>Full name</label>
    <input id="receiverName" type="text" placeholder="e.g. Abebe Kebede" autocomplete="off"/>
    <label>Phone number</label>
    <input id="receiverPhone" type="tel" placeholder="e.g. 0912345678" inputmode="tel"/>
  </div>

  <!-- ITEM (optional) -->
  <div class="section">
    <div class="section-title">Package (optional)</div>
    <label>What are you sending?</label>
    <textarea id="itemDescription" placeholder="e.g. Documents, shoes, mobile phone…"></textarea>
    <label>Weight (kg)</label>
    <input id="weightKg" type="number" min="0.01" max="5000" step="0.1" placeholder="e.g. 1.5" inputmode="decimal"/>
  </div>

  <!-- SENDER LOCATION -->
  <div class="section">
    <div class="section-title">Your pickup location (optional)</div>
    <div class="location-row">
      <button class="loc-btn" id="locBtn" type="button">📍 Share location</button>
      <span class="location-status" id="locStatus">Not shared</span>
    </div>
    <label>Or type your pickup address</label>
    <input id="senderAddress" type="text" placeholder="e.g. Bole, Addis Ababa"/>
  </div>

  <!-- PHOTO (optional) -->
  <div class="section">
    <div class="section-title">Photo of item (optional)</div>
    <label class="photo-label">
      <input type="file" id="photoInput" accept="image/*"/>
      <span class="photo-btn">📸 Choose photo</span>
      <span id="photoName">No file chosen</span>
    </label>
    <img id="photoPreview" alt="Preview"/>
  </div>

  <!-- PAYMENT PARTY -->
  <div class="section">
    <div class="section-title">Who pays the delivery fee?</div>
    <select id="paymentParty">
      <option value="SENDER">I pay</option>
      <option value="RECEIVER">Receiver pays</option>
    </select>
  </div>

  <div class="spacer"></div>
  <div id="toast"></div>

<script>
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Apply theme
  document.documentElement.style.setProperty('--bg', tg.themeParams?.bg_color || '#fff');

  // Show main button
  tg.MainButton.setText('Create Order');
  tg.MainButton.show();
  tg.MainButton.onClick(submitOrder);

  // ── State ──────────────────────────────────────────
  let senderLat = null, senderLng = null;
  let uploadedPhotoUrl = null;

  // ── Location ───────────────────────────────────────
  document.getElementById('locBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      setLocStatus('Geolocation not supported', false);
      return;
    }
    const btn = document.getElementById('locBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Getting…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        senderLat = pos.coords.latitude;
        senderLng = pos.coords.longitude;
        btn.disabled = false;
        btn.textContent = '📍 Re-share';
        setLocStatus('✅ ' + senderLat.toFixed(5) + ', ' + senderLng.toFixed(5), true);
      },
      (err) => {
        btn.disabled = false;
        btn.textContent = '📍 Retry';
        setLocStatus('❌ ' + (err.message || 'Failed'), false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
  function setLocStatus(text, ok) {
    const el = document.getElementById('locStatus');
    el.textContent = text;
    el.className = 'location-status' + (ok ? ' ok' : (text.startsWith('❌') ? ' err' : ''));
  }

  // ── Photo preview ──────────────────────────────────
  document.getElementById('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('photoName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById('photoPreview');
      img.src = ev.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Upload photo
    try {
      showToast('⏳ Uploading photo…');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('${apiBase}/api/v1/telegram/webapp/uploads', {
        method: 'POST',
        headers: { Authorization: 'tma ' + tg.initData },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      uploadedPhotoUrl = data.url || data.path || null;
      showToast('✅ Photo uploaded');
    } catch (err) {
      showToast('⚠️ Photo upload failed — order will be created without it');
      uploadedPhotoUrl = null;
    }
  });

  // ── Submit ─────────────────────────────────────────
  async function submitOrder() {
    const receiverName = document.getElementById('receiverName').value.trim();
    const receiverPhone = document.getElementById('receiverPhone').value.trim();
    const itemDescription = document.getElementById('itemDescription').value.trim();
    const weightKg = parseFloat(document.getElementById('weightKg').value);
    const paymentParty = document.getElementById('paymentParty').value;
    const senderAddress = document.getElementById('senderAddress').value.trim() || undefined;

    // Validate only if fields are filled
    if (receiverName && receiverName.length < 2) return showToast('⚠️ Receiver name is too short');
    if (receiverPhone && !/^(\\+?251|0)?9\\d{8}$/.test(receiverPhone.replace(/\\s/g, ''))) return showToast('⚠️ Invalid phone number');
    if (itemDescription && itemDescription.length < 2) return showToast('⚠️ Describe the item (at least 2 characters)');
    if (!isNaN(weightKg) && (weightKg < 0.01 || weightKg > 5000)) return showToast('⚠️ Enter a valid weight (0.01 – 5000 kg)');

    tg.MainButton.showProgress(false);
    tg.MainButton.disable();

    const payload: any = {
      paymentParty,
      senderAddress,
      ...(senderLat != null && senderLng != null ? { senderLat, senderLng } : {}),
      ...(uploadedPhotoUrl ? { photoUrl: uploadedPhotoUrl } : {}),
    };

    // Only add receiver fields if at least one is filled
    if (receiverName || receiverPhone) {
      payload.receiverName = receiverName;
      payload.receiverPhone = receiverPhone.replace(/\\s/g, '');
    }

    // Only add item fields if filled
    if (itemDescription) {
      payload.itemDescription = itemDescription;
      if (!isNaN(weightKg) && weightKg >= 0.01 && weightKg <= 5000) {
        payload.weightKg = weightKg;
      }
    };

    try {
      const res = await fetch('${apiBase}/api/v1/telegram/webapp/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'tma ' + tg.initData,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Error');
        throw new Error(msg);
      }
      // Success — close the Mini App and show result
      tg.showAlert('✅ Order created!\\nTracking: ' + data.trackingNumber, () => tg.close());
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed'));
      tg.MainButton.hideProgress();
      tg.MainButton.enable();
    }
  }

  // ── Helpers ───────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    clearTimeout(toastTimer);
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }
</script>
</body>
</html>`;
}
