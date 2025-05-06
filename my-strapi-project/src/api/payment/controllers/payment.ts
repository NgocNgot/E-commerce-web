import { factories } from "@strapi/strapi";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export default factories.createCoreController(
  "api::payment.payment",
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const { amount, paymentMethodId, ...rest } = ctx.request.body.data;
        const { user } = ctx.state;

        if (!amount || !paymentMethodId) {
          return ctx.badRequest(
            "Missing required parameters (amount, paymentMethodId) for payment processing."
          );
        }

        let stripeCustomerId = user?.stripeCustomerId;

        if (!stripeCustomerId && user?.id) {
          try {
            const customer = await stripe.customers.create({
              email: user.email,
              name: user.username,
            });
            stripeCustomerId = customer.id;
            // save stripeCustomerId to User in Strapi
            await strapi.entityService.update(
              "plugin::users-permissions.user",
              user.id,
              {
                data: {
                  stripeCustomerId: stripeCustomerId,
                },
              }
            );
            console.log(
              `stripeCustomerId created and saved for user ${user.id}: ${stripeCustomerId}`
            );
          } catch (error) {
            console.error("Error creating and saving stripeCustomerId:", error);
          }
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method: paymentMethodId,
          confirm: true,
          return_url: "http://localhost:3000/payment-success",
          customer: stripeCustomerId,
        });
        console.log("PaymentIntent created:", paymentIntent);
        if (
          paymentIntent.status === "succeeded" &&
          stripeCustomerId &&
          paymentMethodId
        ) {
          try {
            const paymentMethod = await stripe.paymentMethods.attach(
              paymentMethodId,
              { customer: stripeCustomerId }
            );
            console.log("PaymentMethod attached to Customer:", paymentMethod);
          } catch (error) {
            console.error("Error attaching PaymentMethod to Customer:", error);
          }
        }

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
                subscriptions: true, // Populate trường subscriptions của Order
              },
            },
            users_permissions_user: true,
          },
        });

        if (!payment || !payment.order) {
          return ctx.notFound("Payment or order not found");
        }
        // Send email confirmation
        try {
          const order = payment.order;
          const orderId = order.documentId;
          const customerName = payment.users_permissions_user.username;
          const totalPrice = order.totalPrice;
          const discountAmount = order.discountAmount || 0;
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
                <td style="border: 1px solid #ddd; padding: 8px;">${item.totalItemPrice} USD</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity * item.totalItemPrice} USD</td>
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
            "{{discountAmount}}",
            discountAmount.toFixed(2) + " USD"
          );
          emailHTML = emailHTML.replace(
            "{{totalPrice}}",
            totalPrice.toFixed(2) + " USD"
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

          // Return the clientSecret in the response
          ctx.send({
            success: true,
            paymentIntent,
            data: entry,
            clientSecret: paymentIntent.client_secret,
          });
        } catch (error) {
          console.log("Error sending email:", error);
          // Return the clientSecret even if email fails (for payment confirmation on frontend)
          ctx.send({
            success: true,
            paymentIntent,
            data: entry,
            clientSecret: paymentIntent.client_secret,
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
