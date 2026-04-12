
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    } else {
      entry.target.classList.remove("show");
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll(".reveal").forEach(el => {
  observer.observe(el);
});

const imgElement = document.getElementById("rideImage");

if (imgElement) {

  const rideImages = [
    "../images/yalla6.jpeg",
    "../images/yalla7.jpeg",
    "../images/yallachild.jpeg",
    "../images/yalla8.png"
  ];

  let index = 0;

  window.changeRide = function (i) {

    index = i;

    imgElement.style.opacity = 0;

    setTimeout(() => {
      imgElement.src = rideImages[index];
      imgElement.style.opacity = 1;
    }, 200);

    const items = document.querySelectorAll(".why-item");

    items.forEach(item => {
      item.classList.remove("active");
    });

    items[i].classList.add("active");

  }

}
document.querySelectorAll(".faq-question").forEach(btn => {
  btn.addEventListener("click", () => {

    const item = btn.parentElement;

    item.classList.toggle("active");

  });
});
