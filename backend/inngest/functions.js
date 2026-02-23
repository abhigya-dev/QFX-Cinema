import { inngest } from "./client.js";
import { sendEmail, getOTPTemplate, getResetPasswordTemplate } from "../utils/email.js";
import { generateTicketPDF } from "../utils/pdf.js";
import Booking from "../database/models/booking.model.js";
import Movie from "../database/models/movie.model.js";
import Show from "../database/models/show.model.js";
import User from "../database/models/user.model.js";
import Seat from "../database/models/seat.model.js";
import path from "path";
import fs from "fs";
import { getIO } from "../utils/socket.js";

const getShowDateTime = (show) => {
    if (show?.startsAt) {
        const startsAt = new Date(show.startsAt);
        if (!Number.isNaN(startsAt.getTime())) {
            return startsAt;
        }
    }

    const showDate = new Date(show.date);
    const y = showDate.getUTCFullYear();
    const m = String(showDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(showDate.getUTCDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;
    return new Date(`${isoDate}T${show.time}`);
};

// Function to send signup OTP email
export const sendSignupOTP = inngest.createFunction(
    { id: "send-signup-otp" },
    { event: "auth/signup" },
    async ({ event, step }) => {
        const { user } = event.data;

        await step.run("send-email", async () => {
            await sendEmail({
                to: user.email,
                subject: "Verify your email - QFX Cinemas",
                html: getOTPTemplate(user.name, user.otp),
            });
        });

        return { success: true };
    }
);

// Function to send password reset email
export const sendPasswordResetEmail = inngest.createFunction(
    { id: "send-password-reset" },
    { event: "auth/forgot-password" },
    async ({ event, step }) => {
        const { user, resetUrl } = event.data;

        await step.run("send-email", async () => {
            await sendEmail({
                to: user.email,
                subject: "Reset your password - QFX Cinemas",
                html: getResetPasswordTemplate(user.name, resetUrl),
            });
        });

        return { success: true };
    }
);

// Function to handle confirmed booking
export const handleBookingConfirmed = inngest.createFunction(
    { id: "handle-booking-confirmed" },
    { event: "booking/confirmed" },
    async ({ event, step }) => {
        const { bookingId, userId, showId, movieId } = event.data;

        const booking = await step.run("fetch-booking", async () => {
            return await Booking.findById(bookingId).populate('seatIds');
        });

        const movie = await step.run("fetch-movie", async () => {
            return await Movie.findById(movieId);
        });

        const show = await step.run("fetch-show", async () => {
            return await Show.findById(showId);
        });

        const user = await step.run("fetch-user", async () => {
            return await User.findById(userId);
        });

        const pdfPath = path.join(process.cwd(), 'temp', `ticket-${bookingId}.pdf`);

        await step.run("generate-pdf", async () => {
            await generateTicketPDF(booking, movie, show, user, pdfPath);
        });

        await step.run("send-confirmation-email", async () => {
            await sendEmail({
                to: user.email,
                subject: `Booking Confirmed - ${movie.title}`,
                html: `<h1>Enjoy the movie, ${user.name}!</h1><p>Your booking for ${movie.title} is confirmed. Details are attached.</p>`,
                attachments: [{
                    filename: `ticket-${bookingId}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf'
                }]
            });
            // Cleanup temp PDF after sending
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        });

        // Schedule reminder 2 hours before show
        const showTime = getShowDateTime(show);
        const reminderTime = new Date(showTime.getTime() - 2 * 60 * 60 * 1000);

        if (reminderTime > new Date()) {
            await step.sleepUntil("wait-for-reminder", reminderTime);
            await step.run("send-reminder", async () => {
                await inngest.send({
                    name: "booking/reminder",
                    data: { userId, movieTitle: movie.title, startTime: show.time }
                });
            });
        }

        return { success: true };
    }
);

// Function to send booking reminder
export const sendBookingReminder = inngest.createFunction(
    { id: "send-booking-reminder" },
    { event: "booking/reminder" },
    async ({ event, step }) => {
        const { userId, movieTitle, startTime } = event.data;
        const user = await User.findById(userId);

        await step.run("send-email", async () => {
            await sendEmail({
                to: user.email,
                subject: `Reminder: ${movieTitle} starts soon!`,
                html: `<p>Hi ${user.name}, your movie <b>${movieTitle}</b> starts at ${startTime}. Don't be late!</p>`,
            });
        });

        return { success: true };
    }
);

// Function to auto-release reserved seats after 5 mins
export const autoReleaseSeats = inngest.createFunction(
    { id: "auto-release-seats" },
    { event: "seat/reserved" },
    async ({ event, step }) => {
        const { seatIds, showId } = event.data;

        await step.sleep("wait-5-mins", "5m");

        const releasedSeats = await step.run("release-seats", async () => {
            const seats = await Seat.find({
                _id: { $in: seatIds },
                status: 'reserved'
            });

            if (seats.length > 0) {
                await Seat.updateMany(
                    { _id: { $in: seats.map(s => s._id) } },
                    { status: 'available', reservedBy: null, reservedUntil: null }
                );
                return seats.map(s => s._id.toString());
            }
            return [];
        });

        if (releasedSeats.length > 0) {
            await step.run("emit-socket", async () => {
                const io = getIO();
                io.to(showId).emit('seatsReleased', { seatIds: releasedSeats });
                const seats = await Seat.find({ _id: { $in: releasedSeats } });
                io.to(showId).emit('seatStatusUpdated', {
                    showId: String(showId),
                    seats: seats.map((seat) => ({
                        _id: String(seat._id),
                        showId: String(seat.showId),
                        status: seat.status,
                        reservedBy: seat.reservedBy ? String(seat.reservedBy) : null,
                        reservedUntil: seat.reservedUntil || null,
                        seatNumber: seat.seatNumber,
                        row: seat.row,
                    })),
                });
            });
        }

        return { success: true };
    }
);
