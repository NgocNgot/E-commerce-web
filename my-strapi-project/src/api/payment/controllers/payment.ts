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
        const {
          amount,
          paymentMethodId,
          isSubscriptionPayment,
          subscriptionFrequencyType,
          subscriptionFrequencyInterval,
          ...rest
        } = ctx.request.body.data;
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
            // Save stripeCustomerId to User in Strapi
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
          setup_future_usage: "off_session",
        });
        console.log("PaymentIntent created:", paymentIntent);

        if (paymentIntent.status !== "succeeded") {
          return ctx.badRequest({
            success: false,
            message: "Payment failed",
            paymentIntent,
          });
        }

        // Create Payment entry
        const paymentEntry = await strapi.entityService.create(
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
        // Get Order
        const order = await strapi.db.query("api::order.order").findOne({
          where: { id: rest.order.id },
        });
        if (!order) {
          return ctx.notFound("Order not found");
        }

        // Create Subscription
        let subscriptionEntry = null;
        if (
          isSubscriptionPayment &&
          subscriptionFrequencyType &&
          subscriptionFrequencyInterval
        ) {
          const confirmedAt = new Date();
          let nextOrderDate = new Date(confirmedAt);

          if (subscriptionFrequencyType === "Week") {
            nextOrderDate.setDate(
              nextOrderDate.getDate() +
                7 / parseInt(subscriptionFrequencyInterval)
            );
          } else if (subscriptionFrequencyType === "Month") {
            const intervalInDays = Math.round(
              getNumberOfDaysInMonth(
                confirmedAt.getFullYear(),
                confirmedAt.getMonth()
              ) / parseInt(subscriptionFrequencyInterval)
            );
            nextOrderDate.setDate(confirmedAt.getDate() + intervalInDays);
            const daysInNextMonth = getNumberOfDaysInMonth(
              nextOrderDate.getFullYear(),
              nextOrderDate.getMonth()
            );
            if (nextOrderDate.getDate() > daysInNextMonth) {
              nextOrderDate.setDate(daysInNextMonth);
            }
          }
          subscriptionEntry = await strapi.entityService.create(
            "api::subscription.subscription",
            {
              data: {
                users_permissions_users: { id: user.id },
                orders: { id: order.id },
                payments: { id: paymentEntry.id },
                frequencyType: subscriptionFrequencyType,
                frequencyInterval: parseInt(subscriptionFrequencyInterval),
                statusSubscription: "Pending",
                confirmedAt: confirmedAt.toISOString(),
                nextOrderDate: nextOrderDate.toISOString(),
              },
            }
          );
          // Update Order with Subscription
          await strapi.entityService.update("api::order.order", order.id, {
            data: {
              subscription: { id: subscriptionEntry.id },
            },
          });
        }

        // Get Payment with populated data
        const finalPayment = await strapi.db
          .query("api::payment.payment")
          .findOne({
            where: { id: paymentEntry.id },
            populate: {
              users_permissions_user: true,
              order: {
                populate: {
                  lineItems: {
                    populate: {
                      product: true,
                    },
                  },
                  subscription: true,
                },
              },
              subscription: true,
            },
          });
        console.log("-------Final Payment:", finalPayment);

        if (!finalPayment || !finalPayment.order) {
          return ctx.notFound("Payment or order not found");
        }

        try {
          const orderData = finalPayment.order;
          const orderId = orderData.documentId;
          const customerName = finalPayment.users_permissions_user.username;
          const totalPrice = orderData.totalPrice;
          const discountAmount = orderData.discountAmount || 0;
          const recipientEmail = orderData.email;
          const shippingCost = orderData.shippingCost || 0;

          const emailTemplatePath = path.join(
            process.cwd(),
            "emails",
            isSubscriptionPayment
              ? "subscription-confirmation.html"
              : "order-confirmation.html"
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
          orderData.lineItems.forEach((item) => {
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
          if (isSubscriptionPayment) {
            const subscription = finalPayment.subscription;

            emailHTML = emailHTML
              .replace("{{subscriptionId}}", subscription.documentId)
              .replace("{{customerName}}", customerName)
              .replace("{{orderItems}}", orderItemsHTML)
              .replace("{{frequencyType}}", subscription.frequencyType)
              .replace("{{frequencyInterval}}", subscription.frequencyInterval)
              .replace(
                "{{firstOrderDate}}",
                new Date(subscription.createdAt).toLocaleDateString("vi-VN")
              )
              .replace(
                "{{nextOrderDate}}",
                new Date(subscription.nextOrderDate).toLocaleDateString("vi-VN")
              )
              .replace(
                "{{confirmationLink}}",
                `http://localhost:3000/confirm-subscription/${subscription.documentId}`
              )
              .replace("{{name}}", orderData.name)
              .replace(
                "{{shippingAddress}}",
                `${orderData.address}, ${orderData.city}`
              )
              .replace("{{phoneNumber}}", orderData.phone);
          } else {
            emailHTML = emailHTML
              .replace("{{orderId}}", orderId)
              .replace("{{customerName}}", customerName)
              .replace("{{orderItems}}", orderItemsHTML)
              .replace("{{shippingCost}}", shippingCost.toFixed(2) + " USD")
              .replace("{{discountAmount}}", discountAmount.toFixed(2) + " USD")
              .replace("{{totalPrice}}", totalPrice.toFixed(2) + " USD")
              .replace(
                "{{orderDate}}",
                new Date(orderData.createdAt).toLocaleDateString("vi-VN")
              )
              .replace(
                "{{shippingAddress}}",
                `${orderData.address}, ${orderData.city}`
              )
              .replace("{{phoneNumber}}", orderData.phone)
              .replace("{{name}}", orderData.name);
          }

          // Send email confirmation
          await strapi.plugins.email.services.email.send({
            to: recipientEmail,
            from: "nbichngoc3904@gmail.com",
            subject:
              isSubscriptionPayment && finalPayment.order.subscription
                ? `Subscription Confirmation #${finalPayment.order.subscription.documentId || "N/A"}`
                : `Confirmation of Order #${orderId}`,
            html: emailHTML,
          });

          // Return the clientSecret in the response
          ctx.send({
            success: true,
            paymentIntent,
            data: finalPayment,
            clientSecret: paymentIntent.client_secret,
          });
        } catch (error) {
          console.log("Error sending email:", error);
          ctx.send({
            success: true,
            paymentIntent,
            data: finalPayment,
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

function getNumberOfDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
