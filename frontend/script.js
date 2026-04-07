document.addEventListener("DOMContentLoaded", () => {
  const loaderButton = document.querySelector("[data-loader-start]") || document.querySelector(".btn");
  if (!loaderButton) {
    return;
  }

  loaderButton.addEventListener("click", (event) => {
    const href = loaderButton.getAttribute("href");
    if (href) {
      return;
    }
    event.preventDefault();
    window.location.href = "loader.html";
  });
});
