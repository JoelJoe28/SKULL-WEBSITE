window.SKULLUPI = (function () {
  const config = {
    upiId: "joelvini2007@okicici",
    merchantName: "SKULL Streetwear"
  };

  function buildUPILink(amount, orderId, note) {
    const params = new URLSearchParams({
      pa: config.upiId,
      pn: config.merchantName,
      am: String(amount || 0),
      cu: "INR",
      tn: note || `SKULL order ${orderId || Date.now()}`
    });
    return `upi://pay?${params.toString()}`;
  }

  function buildQRUrl(amount, orderId, note) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(buildUPILink(amount, orderId, note))}`;
  }

  function open(amount, orderId, note) {
    window.location.href = buildUPILink(amount, orderId, note);
  }

  return {
    config,
    buildQRUrl,
    buildUPILink,
    open
  };
})();
