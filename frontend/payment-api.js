window.SKULLPaymentAPI = (function () {
  function normalizeAmount(value) {
    return Number(value || 0);
  }

  async function getOrderSummary(orderData) {
    const subtotal = normalizeAmount(orderData?.subtotal);
    const shipping = normalizeAmount(orderData?.shippingCost);
    const tax = normalizeAmount(orderData?.tax);
    return {
      success: true,
      summary: {
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping + tax
      }
    };
  }

  async function processPayment(orderData) {
    return {
      success: true,
      orderId: orderData?.id || Date.now(),
      paymentMethod: orderData?.payment?.method || "cod"
    };
  }

  async function initiateRazorpayPayment(orderData) {
    return {
      success: false,
      message: "Razorpay is not connected in this local demo build.",
      orderData
    };
  }

  return {
    getOrderSummary,
    initiateRazorpayPayment,
    processPayment
  };
})();
