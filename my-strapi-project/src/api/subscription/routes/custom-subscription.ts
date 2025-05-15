export default {
  routes: [
    {
      method: "GET",
      path: "/api/confirm-subscription/:token",
      handler: "api::subscription.subscription.confirmSubscriptionByToken",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
