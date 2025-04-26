/* Nuevo!
*/document.addEventListener("DOMContentLoaded", () => {
  // Ruta al archivo JSON
  const jsonFilePath = "json/fish.json";

  // Función para cargar el JSON
  fetch(jsonFilePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cargar el archivo JSON");
      }
      return response.json();
    })
    .then((data) => {
      // Navegar por la estructura del JSON para encontrar el pez "Gatvaire"
      const family = data.itemListElement[0]; // Familia: Chondrichthyes
      const subfamily = family.childTaxon[0]; // Subfamilia: Elasmobranchii
      const fishData = subfamily.childTaxon.find(
        (fish) => fish.alternateName === "Gatvaire"
      );

      if (fishData) {
        // Actualizar el título y la descripción de la página
        document.querySelector(".peix h1").textContent = fishData.alternateName;
        document.querySelector(".peix .current").textContent = fishData.alternateName;
       /* document.querySelector(".page-title p").textContent = fishData.description;*/

        // Actualizar las imágenes del carrusel
        const swiperWrapper = document.querySelector(".swiper-wrapper");
        swiperWrapper.innerHTML = `
          <div class="swiper-slide">
            <img src="assets/img/peces/01_scyliorhinus_stellaris.webp" alt="Imagen 1 de Gatvaire">
          </div>
          <div class="swiper-slide">
            <img src="assets/img/peces/02_scyliorhinus_stellaris.webp" alt="Imagen 2 de Gatvaire">
          </div>
          <div class="swiper-slide position-relative mt-4">
            <img src="assets/img/peces/01_scyliorhinus_stellaris.webp" class="img-fluid rounded-4" alt="Imagen 3 de Gatvaire">
            <a href="https://www.youtube.com/watch?v=zMG06pVoWqk" class="glightbox pulsating-play-btn"></a>
          </div>
        `;

        // Actualizar la información del pez
        const fishInfo = document.querySelector(".fish-info ul");
        fishInfo.innerHTML = `
          <li><strong>Nombre científico</strong>: ${fishData.hasDefinedTerm}</li>
          <li><strong>Familia</strong>: ${family.hasDefinedTerm}</li>
          <li><strong>Subfamilia</strong>: ${subfamily.hasDefinedTerm}</li>
          <li><strong>Hábitat</strong>: ${
            fishData.additionalProperty.find((prop) => prop.name === "Habitat").value
          }</li>
          <li><strong>Distribución</strong>: ${
            fishData.additionalProperty.find((prop) => prop.name === "Distribución").value
          }</li>
          <li><strong>Más información</strong>: <a href="${fishData.sameAs}" target="_blank">Wikipedia</a></li>
        `;

        // Actualizar la descripción del pez
        const fishDescription = document.querySelector(".fish-description p");
        fishDescription.textContent = fishData.description;
      } else {
        console.error("No se encontró información para el pez 'Gatvaire'");
      }
    })
    .catch((error) => {
      console.error("Error al procesar el archivo JSON:", error);
    });
});