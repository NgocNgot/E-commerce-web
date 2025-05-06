import cron from "node-cron";
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

            const paymentMethodIdFromFirstPayment =
              firstPayment?.paymentMethodId;

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

                  // Tạo Payment entity
                  const createdPayment = await strapi.entityService.create(
                    "api::payment.payment",
                    {
                      data: {
                        amount: createdOrder.totalPrice,
                        currency: "usd",
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
                    statusSubscription: "ErrorNoPaymentMethodIdInFirstPayment",
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
