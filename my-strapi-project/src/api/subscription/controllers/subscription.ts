// /**
//  * subscription controller
//  */

// import { factories } from "@strapi/strapi";

// export default factories.createCoreController("api::subscription.subscription");

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::subscription.subscription",
  ({ strapi }) => ({
    async confirmSubscriptionByToken(ctx) {
      const { token } = ctx.params;

      if (!token) {
        return ctx.badRequest("Confirmation token is missing.");
      }

      try {
        const subscription = await strapi.db
          .query("api::subscription.subscription")
          .findOne({
            where: { id: token },
          });

        if (!subscription) {
          return ctx.notFound("Subscription not found.");
        }

        const updatedSubscription = await strapi.entityService.update(
          "api::subscription.subscription",
          subscription.id,
          {
            data: {
              statusSubscription: "Active",
              confirmedAt: new Date().toISOString(),
            },
          }
        );

        ctx.send({
          message: "Subscription confirmed!",
          data: updatedSubscription,
        });
      } catch (error) {
        console.error("Error confirming subscription:", error);
        ctx.internalServerError("Error confirming subscription.");
      }
    },
  })
);
