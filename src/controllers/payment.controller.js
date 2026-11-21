const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { ensureRoomAccessCode } = require("../utils/roomAccessCode");

const Payment = require("../models/payment.model");
const Booking = require("../models/booking.model");

const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const respondWithError = (res, error) => {
  console.error("Payment error:", {
    message: error.message,
    status: error.response?.status,
    code: error.code,
  });
  const status = error.response ? 502 : 500;

  return res.status(status).json({
    success: false,
    message:
      status === 502
        ? "Payment service is temporarily unavailable"
        : "An unexpected error occurred. Please try again later.",
  });
};

const getSafePaymentData = (payment) => ({
  reference: payment.paymentReference,
  paymentStatus: payment.paymentStatus,
  amount: payment.amount,
  currency: payment.currency,
  paidAt: payment.paidAt || null,
});

const getSafeBookingData = (booking) => {
  if (!booking) return null;

  return {
    bookingId: booking._id,
    bookingStatus: booking.bookingStatus,
  };
};

const transactionMatchesPayment = (transaction, payment) =>
  transaction.reference === payment.paymentReference &&
  transaction.amount === payment.amount &&
  transaction.currency === payment.currency;

const markForManualReview = async (payment, note, booking) => {
  payment.reconciliationStatus = "NeedsReview";
  payment.reconciliationNote = note;
  await payment.save();

  return { kind: "review", payment, booking, note };
};


const finalizeSuccessfulPayment = async (payment, transaction) => {
  if (!transactionMatchesPayment(transaction, payment)) {
    return { kind: "mismatch" };
  }

  if (payment.paymentStatus === "Refunded") {
    return { kind: "refunded", payment };
  }

  if (transaction.status !== "success") {
    return { kind: "not_successful", status: transaction.status };
  }

  // Record the successful payment first.
  payment.paymentStatus = "Successful";
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  let booking = await Booking.findOne({
    _id: payment.booking,
    guest: payment.guest,
  });

  if (!booking) {
    return markForManualReview(
      payment,
      "Payment succeeded, but the associated booking could not be found.",
      null
    );
  }

  // Never confirm a booking without successful ID verification
  if (booking.idVerificationStatus !== "Verified") {
    return markForManualReview(
      payment,
      "Payment succeeded without completed ID verification. Manual review required.",
      booking
    );
  }

  // Only confirm a pending booking if its payment deadline has not passed.
  if (booking.bookingStatus === "Pending") {
    const now = new Date();

    const update = await Booking.updateOne(
      {
        _id: booking._id,
        guest: payment.guest,
        bookingStatus: "Pending",
        expiresAt: { $gt: now },
      },
      {
        $set: { bookingStatus: "Confirmed" },
      }
    );

    if (update.modifiedCount === 1) {
      booking = await ensureRoomAccessCode(booking._id);

      return { kind: "confirmed", payment, booking };
    }

    // Re-fetch because another operation may have changed the booking.
    booking = await Booking.findById(booking._id);
  }

  // If the booking is still pending but its deadline has passed,
  // cancel it rather than confirming it.
  if (booking?.bookingStatus === "Pending") {
    const now = new Date();

    const expiredUpdate = await Booking.updateOne(
      {
        _id: booking._id,
        guest: payment.guest,
        bookingStatus: "Pending",
        $or: [
          { expiresAt: { $lte: now } },
          { expiresAt: null },
        ],
      },
      {
        $set: { bookingStatus: "Cancelled" },
      }
    );

    if (expiredUpdate.modifiedCount === 1) {
      booking = await Booking.findById(booking._id);

      return markForManualReview(
        payment,
        "Payment succeeded after the booking payment deadline. Manual refund review required.",
        booking
      );
    }
  }

  if (booking?.bookingStatus === "Confirmed") {
    const otherSuccessfulPayment = await Payment.exists({
      _id: { $ne: payment._id },
      booking: payment.booking,
      paymentStatus: "Successful",
    });

    if (otherSuccessfulPayment) {
      return markForManualReview(
        payment,
        "Another successful payment already exists for this booking",
        booking
      );
    }

    if (payment.reconciliationStatus === "NeedsReview") {
      return {
        kind: "review",
        payment,
        booking,
        note:
          payment.reconciliationNote ||
          "Payment still requires manual review",
      };
    }

  booking = await ensureRoomAccessCode(booking._id);

  return { kind: "confirmed", payment, booking };  }

  return markForManualReview(
    payment,
    `Booking status is ${
      booking?.bookingStatus || "unavailable"
    } after successful payment`,
    booking
  );
};


const markFailedPayment = async (payment, transaction) => {
  if (!transactionMatchesPayment(transaction, payment)) {
    return { kind: "mismatch" };
  }

  if (payment.paymentStatus === "Successful") {
    return { kind: "confirmed", payment };
  }

  if (payment.paymentStatus === "Refunded") {
    return { kind: "failed", payment };
  }

  if (["failed", "abandoned"].includes(transaction.status)) {
    payment.paymentStatus = "Failed";
    await payment.save();
    return { kind: "failed", payment };
  }

  return { kind: "not_successful", status: transaction.status };
};

const sendExistingPayment = (res, payment) => {
  if (payment.paymentStatus === "Successful") {
    return res.status(409).json({
      success: false,
      message: "A successful payment already exists for this booking",
      reference: payment.paymentReference,
      paymentStatus: payment.paymentStatus,
    });
  }

  if (!payment.authorizationUrl || !payment.accessCode) {
    return res.status(409).json({
      success: false,
      message: "A payment attempt is already in progress; verify it before retrying",
      reference: payment.paymentReference,
      paymentStatus: payment.paymentStatus,
    });
  }

    return res.status(200).json({
    success: true,
    message: "Reusing the existing payment attempt",
    data: {
        authorizationUrl: payment.authorizationUrl,
        accessCode: payment.accessCode,
        ...getSafePaymentData(payment),
    },
    });
};

const initializePayment = async (req, res) => {
  let payment;

  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a booking ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    if (!req.guest.email) {
      return res.status(400).json({
        success: false,
        message: "A guest email is required to initialize payment",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      guest: req.guest._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const successfulPayment = await Payment.findOne({
      booking: booking._id,
      guest: req.guest._id,
      paymentStatus: "Successful",
    });

    if (successfulPayment) {
      return sendExistingPayment(res, successfulPayment);
    }

    // ID verification must be completed before payment
    
    if (booking.idVerificationStatus !== "Verified") {
      return res.status(403).json({
        success: false,
        message:
          booking.idVerificationStatus === "NeedsReview"
            ? "Your ID photo could not be clearly verified. Please retake and upload another photo."
            : booking.idVerificationStatus === "Rejected"
            ? "Your ID verification was unsuccessful. Please review the instructions and try again, or contact support."
            : "Please complete identity verification before making payment.",
        idVerificationStatus: booking.idVerificationStatus,
        canRetake: ["NeedsReview", "Rejected"].includes(
          booking.idVerificationStatus
        ),
      });
    }


    // Check whether the payment deadline has expired
    if (!booking.expiresAt || booking.expiresAt <= new Date()) {
      await Booking.updateOne(
        {
          _id: booking._id,
          guest: req.guest._id,
          bookingStatus: "Pending",
        },
        {
          $set: { bookingStatus: "Cancelled" },
        }
      );

      return res.status(400).json({
        success: false,
        message: "This booking has expired. Please create a new booking.",
      });
    }

    if (booking.bookingStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This booking is not awaiting payment",
      });
    }

    const existingPayment = await Payment.findOne({
      booking: booking._id,
      guest: req.guest._id,
      paymentStatus: "Pending",
    }).sort({ createdAt: -1 });

    if (existingPayment) {
      return sendExistingPayment(res, existingPayment);
    }

    const amountInKobo = Math.round(booking.totalAmount * 100);
    if (!Number.isSafeInteger(amountInKobo) || amountInKobo < 1) {
      return res.status(400).json({
        success: false,
        message: "Booking amount must be greater than zero",
      });
    }

    const paymentReference = `PAY-${crypto.randomUUID()}`;
    try {
      payment = await Payment.create({
        booking: booking._id,
        guest: req.guest._id,
        amount: amountInKobo,
        currency: "NGN",
        paymentReference,
        paymentGateway: "Paystack",
        paymentStatus: "Pending",
      });
    } catch (error) {
      if (error.code === 11000) {
        const concurrentPendingPayment = await Payment.findOne({
          booking: booking._id,
          guest: req.guest._id,
          paymentStatus: "Pending",
        }).sort({ createdAt: -1 });

        if (concurrentPendingPayment) {
          return sendExistingPayment(res, concurrentPendingPayment);
        }
      }

      throw error;
    }

    let response;
    try {
      response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: req.guest.email,
          amount: amountInKobo,
          reference: paymentReference,
          currency: "NGN",
          callback_url: process.env.PAYSTACK_CALLBACK_URL,
          metadata: {
            bookingId: booking._id.toString(),
            guestId: req.guest._id.toString(),
          },
        },
        { headers: paystackHeaders() }
      );
    } catch (error) {
      if (error.response) {
        payment.paymentStatus = "Failed";
        await payment.save();
      }

      return respondWithError(res, error);
    }

    const transaction = response.data?.data;
    if (response.data?.status !== true) {
      payment.paymentStatus = "Failed";
      await payment.save();
      return res.status(502).json({
        success: false,
        message: "Paystack could not initialize payment",
        reference: paymentReference,
        paymentStatus: payment.paymentStatus,
      });
    }

    if (!transaction?.authorization_url || !transaction?.access_code) {
      return res.status(502).json({
        success: false,
        message: "Paystack initialized the transaction but returned incomplete checkout details",
        reference: paymentReference,
        paymentStatus: payment.paymentStatus,
      });
    }

    payment.authorizationUrl = transaction.authorization_url;
    payment.accessCode = transaction.access_code;
    await payment.save();

    return res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        data: {
            authorizationUrl: payment.authorizationUrl,
            accessCode: payment.accessCode,
            reference: payment.paymentReference,
            paymentStatus: payment.paymentStatus,
        },
    });
  } catch (error) {
    return respondWithError(res, error);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const reference = req.body?.reference;
    if (typeof reference !== "string" || !reference.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a payment reference",
      });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    const payment = await Payment.findOne({
      paymentReference: reference.trim(),
      guest: req.guest._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    let transaction;
    if (payment.paymentStatus === "Successful") {
      transaction = {
        reference: payment.paymentReference,
        amount: payment.amount,
        currency: payment.currency,
        status: "success",
      };
    } else {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          payment.paymentReference
        )}`,
        { headers: paystackHeaders() }
      );
      transaction = response.data?.data;

      if (response.data?.status !== true || !transaction) {
        return res.status(502).json({
          success: false,
            message: "Could not verify payment with Paystack",
        });
      }
    }

    if (transaction.status === "success") {
      const result = await finalizeSuccessfulPayment(payment, transaction);
      if (result.kind === "mismatch") {
        return res.status(400).json({
          success: false,
          message: "Paystack transaction does not match this payment",
        });
      }
      if (result.kind === "review") {
        return res.status(409).json({
            success: false,
            message: "Payment succeeded but requires manual review",
            data: {
                payment: getSafePaymentData(result.payment),
                booking: getSafeBookingData(result.booking),
                reconciliationNote: result.note,
            },
        });
      }
      if (result.kind === "refunded") {
        return res.status(409).json({
            success: false,
            message: "This payment has already been refunded",
            data: {
                payment: getSafePaymentData(result.payment),
            },
        });
      }

     return res.status(200).json({
        success: true,
        message: "Payment verified and booking confirmed",
        data: {
            payment: getSafePaymentData(result.payment),
            booking: getSafeBookingData(result.booking),
        },
        });
    }

    const result = await markFailedPayment(payment, transaction);
    if (result.kind === "mismatch") {
      return res.status(400).json({
        success: false,
        message: "Paystack transaction does not match this payment",
      });
    }

    if (payment.paymentStatus === "Refunded") {
     return res.status(409).json({
        success: false,
        message: "This payment has already been refunded",
        data: {
            payment: getSafePaymentData(payment),
        },
    });
    }

    return res.status(409).json({
        success: false,
        message: "Payment has not completed successfully",
        data: {
            paymentStatus: result.payment?.paymentStatus || payment.paymentStatus,
        },
    });
  } catch (error) {
    return respondWithError(res, error);
  }
};

const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    const signature = req.get("x-paystack-signature");
    if (typeof signature !== "string" || !Buffer.isBuffer(req.rawBody)) {
      return res.status(400).json({
        success: false,
        message: "Missing Paystack signature or raw request body",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest();
    const receivedSignature = Buffer.from(signature, "hex");
    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid Paystack signature",
      });
    }

    const { event, data: transaction } = req.body || {};
    if (!["charge.success", "charge.failed"].includes(event)) {
      return res.status(200).json({ success: true, message: "Event ignored" });
    }

    if (!transaction || typeof transaction.reference !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid Paystack event payload",
      });
    }

    const payment = await Payment.findOne({
      paymentReference: transaction.reference,
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        message: "No matching payment; event ignored",
      });
    }

    if (event === "charge.failed") {
      const result = await markFailedPayment(payment, transaction);
      if (result.kind === "mismatch") {
        return res.status(400).json({
          success: false,
          message: "Paystack transaction does not match this payment",
        });
      }

      return res.status(200).json({ success: true, message: "Event processed" });
    }

    const result = await finalizeSuccessfulPayment(payment, transaction);
    if (result.kind === "refunded") {
      return res.status(200).json({
        success: true,
        message: "Refunded payment event acknowledged",
      });
    }

    if (result.kind === "mismatch" || result.kind === "not_successful") {
      return res.status(400).json({
        success: false,
        message: "Paystack event does not match a successful payment",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        result.kind === "review"
          ? "Payment recorded for manual review"
          : "Payment event processed",
    });
  } catch (error) {
    return respondWithError(res, error);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
};
