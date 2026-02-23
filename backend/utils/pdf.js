import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const toUtcDateKey = (value) => {
  const date = new Date(value);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const formatDateTime = (show) => {
  const dateKey = toUtcDateKey(show?.date);
  const dt = new Date(`${dateKey}T${show?.time || '00:00:00'}`);
  return {
    date: dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: dt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

const drawLogoMark = (doc, x, y) => {
  doc.save();
  doc.circle(x + 18, y + 18, 16).fill('#B91C1C');
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('QFX', x + 6, y + 14, {
    width: 24,
    align: 'center',
  });
  doc.restore();
};

const drawField = (doc, label, value, x, y, width) => {
  doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text(label, x, y, { width });
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(String(value || '-'), x, y + 12, {
      width,
      lineBreak: false,
      ellipsis: true,
    });
};

const drawParagraphField = (doc, label, value, x, y, width, height = 34) => {
  doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text(label, x, y, { width });
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text(String(value || '-'), x, y + 12, {
      width,
      height,
      ellipsis: true,
    });
};

const buildQrImage = async (payloadText) => {
  try {
    return await QRCode.toBuffer(payloadText, {
      type: 'png',
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    });
  } catch {
    return null;
  }
};

export const generateTicketPDF = async (booking, movie, show, user, outputPath) => {
  const seatList = (booking?.seatIds || [])
    .map((seat) => seat?.seatNumber)
    .filter(Boolean)
    .join(', ') || 'N/A';

  const issuedAt = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const showMeta = formatDateTime(show);

  const qrPayload = [
    'QFX CINEMAS E-TICKET',
    `Booking: ${booking?._id}`,
    `Movie: ${movie?.title || '-'}`,
    `Date: ${showMeta.date}`,
    `Time: ${showMeta.time}`,
    `Theatre: ${show?.theatreId || '-'}`,
    `Seats: ${seatList}`,
    `Amount: ${formatMoney(booking?.totalAmount)}`,
    `User: ${user?.email || '-'}`,
  ].join('\n');

  const qrImageBuffer = await buildQrImage(qrPayload);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 32 });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const ticketX = 32;
    const ticketY = 40;
    const ticketW = pageWidth - 64;
    const ticketH = 720;

    doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 14).fill('#FFFFFF');
    doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 14).lineWidth(1.2).strokeColor('#E5E7EB').stroke();

    // Header band
    doc.roundedRect(ticketX, ticketY, ticketW, 98, 14).fill('#111827');
    drawLogoMark(doc, ticketX + 18, ticketY + 20);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('QFX CINEMAS', ticketX + 64, ticketY + 28);
    doc.fillColor('#D1D5DB').font('Helvetica').fontSize(11).text('Official Movie E-Ticket', ticketX + 64, ticketY + 56);
    doc.fillColor('#D1D5DB').font('Helvetica').fontSize(10).text(`Issued: ${issuedAt}`, ticketX + ticketW - 190, ticketY + 34, {
      width: 165,
      align: 'right',
    });

    // Ticket title area
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(21).text(movie?.title || 'Untitled Movie', ticketX + 22, ticketY + 124, {
      width: ticketW - 44,
      ellipsis: true,
    });

    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(10)
      .text(`Booking ID: ${booking?._id || '-'}`, ticketX + 22, ticketY + 154, {
        width: ticketW - 44,
        lineBreak: false,
        ellipsis: true,
      });

    // Main content split
    const contentY = ticketY + 184;
    const leftW = ticketW - 210;
    const rightX = ticketX + leftW + 26;

    doc.roundedRect(ticketX + 16, contentY, leftW - 10, 286, 10).fill('#F9FAFB');
    doc.roundedRect(ticketX + 16, contentY, leftW - 10, 286, 10).lineWidth(1).strokeColor('#E5E7EB').stroke();

    drawField(doc, 'Theatre', show?.theatreId || 'QFX Main Hall', ticketX + 30, contentY + 18, 160);
    drawField(doc, 'Show Date', showMeta.date, ticketX + 212, contentY + 18, 170);
    drawField(doc, 'Show Time', showMeta.time, ticketX + 392, contentY + 18, 120);

    drawField(doc, 'Guest Name', user?.name || 'Guest', ticketX + 30, contentY + 72, 170);
    drawField(doc, 'Email', user?.email || '-', ticketX + 212, contentY + 72, 300);

    drawParagraphField(doc, 'Seats', seatList, ticketX + 30, contentY + 126, leftW - 50, 44);

    doc.moveTo(ticketX + 30, contentY + 186).lineTo(ticketX + leftW - 10, contentY + 186).lineWidth(1).strokeColor('#E5E7EB').stroke();

    drawField(doc, 'Amount Paid', formatMoney(booking?.totalAmount), ticketX + 30, contentY + 202, 180);
    drawField(doc, 'Tickets', String((booking?.seatIds || []).length || 0), ticketX + 212, contentY + 202, 140);
    drawField(doc, 'Status', String(booking?.status || 'confirmed').toUpperCase(), ticketX + 392, contentY + 202, 120);

    // QR panel
    doc.roundedRect(rightX - 8, contentY, 168, 286, 10).fill('#FFFFFF');
    doc.roundedRect(rightX - 8, contentY, 168, 286, 10).lineWidth(1).strokeColor('#E5E7EB').stroke();

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text('ENTRY QR', rightX + 42, contentY + 14);
    doc.fillColor('#6B7280').font('Helvetica').fontSize(8).text('Scan at theatre gate', rightX + 27, contentY + 30);

    if (qrImageBuffer) {
      doc.image(qrImageBuffer, rightX + 8, contentY + 48, { fit: [136, 136], align: 'center' });
    } else {
      doc.rect(rightX + 8, contentY + 48, 136, 136).fill('#F3F4F6');
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('QR unavailable', rightX + 36, contentY + 110);
    }

    doc.fillColor('#6B7280').font('Helvetica').fontSize(8).text(`Ref: ${String(booking?._id || '').slice(-10)}`, rightX + 10, contentY + 196, {
      width: 132,
      align: 'center',
    });

    // Perforation separator
    const perforationY = contentY + 318;
    doc.moveTo(ticketX + 16, perforationY).lineTo(ticketX + ticketW - 16, perforationY).dash(5, { space: 4 }).lineWidth(1).strokeColor('#D1D5DB').stroke();
    doc.undash();

    // Footer terms block
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Ticket Terms', ticketX + 22, perforationY + 18);
    doc.fillColor('#4B5563').font('Helvetica').fontSize(10).text('1. Please arrive at least 15 minutes before showtime.', ticketX + 22, perforationY + 40);
    doc.text('2. This ticket is valid only for the specified show, date, and seats.', ticketX + 22, perforationY + 58);
    doc.text('3. Screenshot/copy may be rejected if QR has already been scanned.', ticketX + 22, perforationY + 76);
    doc.text('4. For support, contact support@qfxcinemas.com.', ticketX + 22, perforationY + 94);

    // Bottom strip
    doc.roundedRect(ticketX + 16, ticketY + ticketH - 86, ticketW - 32, 56, 8).fill('#111827');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13).text('ENJOY YOUR SHOW', ticketX + 30, ticketY + ticketH - 66);
    doc.fillColor('#D1D5DB').font('Helvetica').fontSize(9).text('QFX Cinemas | www.qfxcinemas.example | +1 000 000 0000', ticketX + 30, ticketY + ticketH - 46);

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};
