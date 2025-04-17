import { factories } from "@strapi/strapi";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
// url stripe in .envenv
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export default factories.createCoreController(
  "api::payment.payment",
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const { amount, paymentMethodId, ...rest } = ctx.request.body.data;

        if (!amount || !paymentMethodId) {
          return ctx.badRequest(
            "Missing required parameters (amount, paymentMethodId) for payment processing."
          );
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method: paymentMethodId,
          confirm: true,
          return_url: "http://localhost:3000/payment-success",
        });
        console.log("PaymentIntent created:", paymentIntent);

        if (paymentIntent.status !== "succeeded") {
          return ctx.badRequest({
            success: false,
            message: "Payment failed",
            paymentIntent,
          });
        }

        // Payment succeeded, create a new entry in the database
        const entry = await strapi.entityService.create(
          "api::payment.payment",
          {
            data: {
              ...rest,
              amount: amount,
              paymentMethodId: paymentMethodId,
              paymentIntentId: paymentIntent.id,
              statusPayment: "Succeeded",
            },
          }
        );
        const payment = await strapi.db.query("api::payment.payment").findOne({
          where: { id: entry.id },
          populate: {
            order: {
              populate: {
                lineItems: {
                  populate: {
                    product: true,
                  },
                },
              },
            },
            users_permissions_user: true,
          },
        });

        if (!payment || !payment.order) {
          return ctx.notFound("Payment or order not found");
        }

        try {
          const order = payment.order;
          const orderId = order.documentId;
          const customerName = payment.users_permissions_user.username;
          const totalPrice = order.totalPrice;
          const recipientEmail = order.email;
          const shippingCost = order.shippingCost || 0;

          const emailTemplatePath = path.join(
            process.cwd(),
            "emails",
            "order-confirmation.html"
          );

          let emailHTML = fs.readFileSync(emailTemplatePath, "utf8");
          let orderItemsHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quantity</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Price</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Total</th>
                </tr>
              </thead>
              <tbody>
          `;
          order.lineItems.forEach((item) => {
            orderItemsHTML += `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.title || "Not found name Product"}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.price} USD</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity * item.price} USD</td>
                </tr>
            `;
          });
          orderItemsHTML += `
              </tbody>
            </table>
          `;
          // Replace placeholders in the email template with actual data
          emailHTML = emailHTML.replace("{{orderId}}", orderId);
          emailHTML = emailHTML.replace("{{customerName}}", customerName);
          emailHTML = emailHTML.replace("{{orderItems}}", orderItemsHTML);
          emailHTML = emailHTML.replace(
            "{{shippingCost}}",
            shippingCost.toFixed(2) + " USD"
          );
          emailHTML = emailHTML.replace(
            "{{totalAmount}}",
            totalPrice + shippingCost + " USD"
          );
          emailHTML = emailHTML.replace(
            "{{orderDate}}",
            new Date(order.createdAt).toLocaleDateString("vi-VN")
          );
          emailHTML = emailHTML.replace(
            "{{shippingAddress}}",
            `${order.address}, ${order.city}`
          );
          emailHTML = emailHTML.replace("{{phoneNumber}}", order.phone);
          emailHTML = emailHTML.replace("{{name}}", order.name);
          // Send email confirmation
          await strapi.plugins.email.services.email.send({
            to: recipientEmail,
            from: "nbichngoc3904@gmail.com",
            subject: `Confirmation of Order #${orderId}`,
            html: emailHTML,
          });

          ctx.send({ success: true, paymentIntent, data: entry });
        } catch (error) {
          console.log("Error sending email:", error);
          ctx.send({
            success: true,
            paymentIntent,
            data: entry,
            message: "Payment successful, but email could not be sent.",
          });
        }
      } catch (error) {
        console.error("Stripe error during create:", error);
        return ctx.badRequest("Payment error during create", {
          message: error.message,
        });
      }
    },
  })
);
