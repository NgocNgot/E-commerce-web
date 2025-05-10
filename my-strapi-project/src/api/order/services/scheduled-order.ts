import cron from "node-cron";
import path from "path";
import fs from "fs";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export default ({ strapi }: { strapi: any }) => ({
  async checkAndCreateOrders() {
    try {
      if (!strapi) {
        console.error("Strapi object not passed to service!");
        return;
      }

      const now = new Date();

      const subscriptions = await strapi.entityService.findMany(
        "api::subscription.subscription",
        {
          populate: {
            users_permissions_users: true,
            orders: {
              populate: {
                shipping: true,
              },
            },
            payments: true,
          },
        }
      );
      let ordersCreated = 0;
      let paymentsCreated = 0;

      for (const subscription of subscriptions) {
        const nextOrderDate = new Date(subscription.nextOrderDate);

        console.log(
          `Subscription ID: ${subscription.id}, Next Order Date:`,
          nextOrderDate.toISOString(),
          `, Status: ${subscription.statusSubscription}`
        );

        if (
          nextOrderDate <= now &&
          ["Pending", "Active"].includes(subscription.statusSubscription)
        ) {
          const firstOrder = subscription.orders[0];
          const user = subscription.users_permissions_users[0];

          if (firstOrder && user?.stripeCustomerId) {
            const firstPayment = subscription.payments.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )[0];
            let paymentMethodIdFromFirstPayment = null;

            if (firstPayment?.paymentMethodId) {
              try {
                const pm = await stripe.paymentMethods.retrieve(
                  firstPayment.paymentMethodId
                );

                if (pm.customer === user.stripeCustomerId) {
                  paymentMethodIdFromFirstPayment = pm.id;
                } else {
                  console.warn(
                    `PaymentMethod ${pm.id} is not attached to customer ${user.stripeCustomerId}, skipping.`
                  );
                }
              } catch (err) {
                console.warn(
                  `Failed to retrieve payment method ${firstPayment.paymentMethodId}`,
                  err
                );
                paymentMethodIdFromFirstPayment = null;
              }
            }
            if (
              !paymentMethodIdFromFirstPayment &&
              user.stripePaymentMethodId
            ) {
              paymentMethodIdFromFirstPayment = user.stripePaymentMethodId;
            }

            if (paymentMethodIdFromFirstPayment) {
              const newOrderData = {
                data: {
                  users_permissions_user:
                    subscription.users_permissions_users[0].id,
                  totalPrice: firstOrder.totalPrice,
                  name: firstOrder.name,
                  address: firstOrder.address,
                  city: firstOrder.city,
                  phone: firstOrder.phone,
                  email: firstOrder.email,
                  statusCheckout: "Pending",
                  shipping: firstOrder.shipping
                    ? { id: firstOrder.shipping.id }
                    : null,
                  shippingCost: firstOrder.shippingCost,
                  discountAmount: firstOrder.discountAmount,
                  voucherCode: firstOrder.voucherCode,
                  lineItems: firstOrder.lineItems.map((item) => ({
                    product: { id: item.product.id },
                    quantity: item.quantity,
                    price: item.price,
                    title: item.title,
                    weight: item.weight,
                    length: item.length,
                    width: item.width,
                    height: item.height,
                    totalItemPrice: item.totalItemPrice,
                  })),
                  subscriptions: [subscription.id],
                },
              };

              const createdOrder = await strapi.entityService.create(
                "api::order.order",
                newOrderData
              );

              console.log("Created Order:", createdOrder);
              if (createdOrder) {
                ordersCreated++;
                const currentDate = new Date(subscription.nextOrderDate);
                let nextDate;
                if (subscription.frequencyType === "Week") {
                  const intervalInDays = 7 * subscription.frequencyInterval;
                  nextDate = new Date(currentDate);
                  nextDate.setDate(currentDate.getDate() + intervalInDays);
                } else if (subscription.frequencyType === "Month") {
                  nextDate = new Date(currentDate);
                  nextDate.setMonth(
                    currentDate.getMonth() + subscription.frequencyInterval
                  );
                }

                try {
                  const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(createdOrder.totalPrice * 1000),
                    currency: "usd",
                    payment_method: paymentMethodIdFromFirstPayment,
                    customer: user.stripeCustomerId,
                    confirm: true,
                    off_session: true,
                  });

                  const paymentStatus =
                    paymentIntent.status === "succeeded"
                      ? "Succeeded"
                      : "Failed";

                  const createdPayment = await strapi.entityService.create(
                    "api::payment.payment",
                    {
                      data: {
                        amount: createdOrder.totalPrice,
                        currency: "USD",
                        users_permissions_user: user.id,
                        order: createdOrder.id,
                        paymentIntentId: paymentIntent.id,
                        statusPayment: paymentStatus,
                        paymentMethodId: paymentIntent.payment_method,
                      },
                    }
                  );

                  console.log("Created Payment:", createdPayment);
                  paymentsCreated++;

                  if (paymentStatus === "Succeeded") {
                    await strapi.entityService.update(
                      "api::subscription.subscription",
                      subscription.id,
                      {
                        data: {
                          nextOrderDate: nextDate.toISOString(),
                          statusSubscription: "Active",
                        },
                      }
                    );
                    // Send order confirmation email
                    if (createdOrder) {
                      let populatedOrder;
                      try {
                        populatedOrder = await strapi.entityService.findOne(
                          "api::order.order",
                          createdOrder.id,
                          {
                            populate: {
                              shipping: true,
                              users_permissions_user: true,
                            },
                          }
                        );

                        if (populatedOrder) {
                          const recipientEmail = populatedOrder.email;
                          const customerName =
                            populatedOrder.users_permissions_user?.username;
                          const orderId = createdOrder.id;
                          const totalPrice = populatedOrder.totalPrice;
                          const discountAmount =
                            populatedOrder.discountAmount || 0;
                          const shippingCost = populatedOrder.shippingCost || 0;
                          const lineItems = createdOrder.lineItems;
                          const emailTemplatePath = path.join(
                            process.cwd(),
                            "emails",
                            "order-confirmation.html"
                          );
                          let emailHTML = fs.readFileSync(
                            emailTemplatePath,
                            "utf8"
                          );
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
                          lineItems.forEach((item) => {
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

                          emailHTML = emailHTML
                            .replace("{{orderId}}", orderId)
                            .replace("{{customerName}}", customerName)
                            .replace("{{orderItems}}", orderItemsHTML)
                            .replace(
                              "{{shippingCost}}",
                              shippingCost?.toFixed(2) + " USD"
                            )
                            .replace(
                              "{{discountAmount}}",
                              discountAmount?.toFixed(2) + " USD"
                            )
                            .replace(
                              "{{totalPrice}}",
                              totalPrice?.toFixed(2) + " USD"
                            )
                            .replace(
                              "{{orderDate}}",
                              new Date(
                                createdOrder.createdAt
                              ).toLocaleDateString("vi-VN")
                            )
                            .replace(
                              "{{shippingAddress}}",
                              `${populatedOrder?.address}, ${populatedOrder?.city}`
                            )
                            .replace("{{phoneNumber}}", populatedOrder?.phone)
                            .replace("{{name}}", populatedOrder?.name);

                          if (recipientEmail && customerName) {
                            await strapi.plugins.email.services.email.send({
                              to: recipientEmail,
                              from: "nbichngoc3904@gmail.com",
                              subject: `Confirmation of Order #${orderId}`,
                              html: emailHTML,
                            });
                            console.log(
                              `Email confirmation sent for Order ID: ${createdOrder.id}`
                            );
                          } else {
                            console.warn(
                              `Could not send email for Order ID ${orderId} due to missing recipient email or username.`
                            );
                          }
                        }
                      } catch (error) {
                        console.error(
                          "Error sending order confirmation email:",
                          error
                        );
                      }
                    }
                  } else {
                    await strapi.entityService.update(
                      "api::subscription.subscription",
                      subscription.id,
                      {
                        data: {
                          statusSubscription: "Failed",
                        },
                      }
                    );
                    console.error(
                      `Payment failed for Subscription ID: ${subscription.id}, Payment Intent ID: ${paymentIntent.id}`
                    );
                  }
                } catch (paymentError) {
                  console.error(
                    `Error creating payment for Subscription ID: ${subscription.id}`,
                    paymentError
                  );
                }
              }
            } else {
              console.warn(
                `No payment method ID found in the first payment for subscription ${subscription.id}`
              );
              await strapi.entityService.update(
                "api::subscription.subscription",
                subscription.id,
                {
                  data: {
                    statusSubscription: "Failed",
                  },
                }
              );
            }
          } else if (!user?.stripeCustomerId) {
            console.warn(
              `stripeCustomerId not found for user ${user?.id} in subscription ${subscription.id}`
            );
            await strapi.entityService.update(
              "api::subscription.subscription",
              subscription.id,
              {
                data: {
                  statusSubscription: "ErrorNoStripeCustomer",
                },
              }
            );
          }
        }
      }
      console.log(`Order created: ${ordersCreated}.`);
      console.log(`Payment created: ${paymentsCreated}.`);
    } catch (error) {
      console.error("Error to check and create Order and Payment:", error);
    }
  },

  scheduleOrderCreation() {
    cron.schedule("* * * * *", async () => {
      console.log("Starting scheduled order and payment creation task...");
      await this.checkAndCreateOrders();
      console.log("Checked and created orders and payments task completed.");
    });
  },
});
