// Sistema de gestión de la biblioteca de peces
class FishLibrary {
    constructor() {
        this.allFish = [];
        this.filteredFish = []; // Nueva propiedad para peces filtrados
        this.currentPage = 1;
        this.itemsPerPage = 12;

        this.init();
    }

    async init() {
        try {
            await this.loadFishData();
            this.renderPage();
        } catch (error) {
            console.error('Error inicializando la biblioteca:', error);
            this.showError('Error al cargar los datos de peces');
        }
    }

    async loadFishData() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('show');
        }

        try {
            const response = await fetch('json/fish.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            this.allFish = this.extractFishFromData(data);

            if (loader) {
                loader.classList.remove('show');
            }
        } catch (error) {
            if (loader) {
                loader.classList.remove('show');
            }
            console.error('Error loading fish data:', error);
            throw error;
        }
    }

    extractFishFromData(data) {
        const fish = [];
        const familyMap = new Map(); // Cache para familias

        // Crear mapa de familias primero
        if (data.itemListElement) {
            data.itemListElement.forEach(family => {
                if (family.alternateName) {
                    familyMap.set(family.identifier, family.alternateName);
                }
            });
        }

        // Función recursiva optimizada
        const extractRecursive = (items, familyName = 'Sin clasificar') => {
            if (!items || !Array.isArray(items)) return;

            items.forEach(item => {
                if (item['@type'] === 'Taxon') {
                    // FILTRO: Excluir elementos que sean nodos taxonómicos intermedios
                    const isIntermediateNode = item.name && 
                        (item.name === 'clase' || 
                         item.name === 'subclase' || 
                         item.name === 'orden' || 
                         item.name === 'suborden' || 
                         item.name === 'familia' || 
                         item.name === 'subfamilia' || 
                         item.name === 'género' || 
                         item.name === 'subgénero');

                    // Si tiene hasDefinedTerm y alternateName, pero NO es un nodo intermedio
                    if (item.hasDefinedTerm && item.alternateName && !isIntermediateNode) {
                        const properties = {};
                        if (item.additionalProperty) {
                            item.additionalProperty.forEach(prop => {
                                properties[prop.name] = prop.value;
                            });
                        }

                        fish.push({
                            id: item.identifier || `fish_${fish.length}`,
                            scientificName: item.hasDefinedTerm,
                            commonName: item.alternateName,
                            description: item.description || '',
                            habitat: properties.Habitat || '',
                            distribution: properties.Distribución || '',
                            video: properties.Video || '',
                            wikipedia: item.sameAs || '',
                            family: familyName
                        });
                    }

                    // Actualizar nombre de familia si existe
                    const currentFamily = familyMap.get(item.identifier) || familyName;

                    // Continúa buscando en childTaxon
                    if (item.childTaxon) {
                        extractRecursive(item.childTaxon, currentFamily);
                    }
                }
            });
        };

        if (data.itemListElement) {
            extractRecursive(data.itemListElement);
        }

        return fish;
    }

    renderPage() {
        this.renderResultsInfo();
        this.renderFishGrid();
        this.renderPagination();
    }

    renderResultsInfo() {
        const resultsInfo = document.getElementById('resultsInfo');
        if (!resultsInfo) return;

        // Usar filteredFish para mostrar el conteo correcto
        const totalResults = this.filteredFish.length;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, totalResults);

        if (totalResults > 0) {
            resultsInfo.textContent = `Mostrando ${startIndex}-${endIndex} de ${totalResults} resultados`;
            resultsInfo.style.display = 'block';
        } else {
            resultsInfo.style.display = 'none';
        }
    }

    renderFishGrid() {
        const grid = document.getElementById('fishGrid');
        const noResults = document.getElementById('noResults');
        
        if (!grid) return;

        // FILTRO: Solo mostrar peces que tienen información detallada (especies finales)
        this.filteredFish = this.allFish.filter(fish => 
            fish.habitat || fish.distribution || fish.video || fish.wikipedia
        );

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredFish.slice(startIndex, endIndex);

        if (pageItems.length === 0) {
            grid.style.display = 'none';
            if (noResults) {
                noResults.style.display = 'block';
            }
            return;
        }

        grid.style.display = 'block';
        if (noResults) {
            noResults.style.display = 'none';
        }

        // Crear la estructura de Bootstrap con las columnas responsivas
        grid.innerHTML = `
            <div class="row gx-4 gx-lg-5 row-cols-2 row-cols-md-3 row-cols-xl-4 justify-content-center">
                ${pageItems.map(fish => this.createFishCard(fish)).join('')}
            </div>
        `;
    }

    createFishCard(fish) {
        // Crear nombre de archivo basado en el nombre común del pez
        const imageName = fish.id;
        
        const imagePath = `assets/img/bib_fish/${fish.id}.webp`;
        
        return `
            <div class="col mb-5">
                <div class="card h-100" onclick="navigateToFish('${fish.id}')" style="cursor: pointer;" data-aos="fade-up" data-aos-delay="100">
                    <!-- Fish image-->
                    <img class="card-img-top" src="${imagePath}" alt="${fish.commonName}" 
                         style="height: 200px; object-fit: contain; background-color: #f8f9fa;" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjhmOWZhIi8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTAgNzAgODAgODAgODAgOTBDODAgMTAwIDkwIDExMCAxMDAgMTEwQzExMCAxMTAgMTIwIDEwMCAxMjAgOTBDMTIwIDgwIDExMCA3MCAxMDAgNzBaIiBmaWxsPSIjY2RkIi8+CjxjaXJjbGUgY3g9Ijk1IiBjeT0iODUiIHI9IjMiIGZpbGw9IiM2NjYiLz4KPC9zdmc+'; this.style.backgroundColor='#f8f9fa';" />
                    <!-- Fish details-->
                    <div class="card-body p-4">
                        <div class="text-center">
                            <!-- Fish name-->
                            <h5 class="fw-bolder">${fish.commonName}</h5>
                            <!-- Scientific name-->
                            <p class="text-muted fst-italic">${fish.scientificName}</p>
                        </div>
                    </div>
                </div>
            </div>
          `;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
    
        // Usar filteredFish en lugar de allFish para la paginación
        const totalPages = Math.ceil(this.filteredFish.length / this.itemsPerPage);
    
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
    
        const paginationHTML = this.generatePaginationHTML(this.currentPage, totalPages);
        
        // Usar estructura de Bootstrap Grid
        pagination.innerHTML = `${paginationHTML}`;
    
        // Agregar event listeners a los botones de paginación (actualizado para Bootstrap)
        pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderPage();
                    
                    // Scroll suave hacia arriba si el elemento existe
                    const serviceDetails = document.getElementById('service-details');
                    if (serviceDetails) {
                        serviceDetails.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }
    
    generatePaginationHTML(currentPage, totalPages) {
        const items = [];
    
        // Botón anterior
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        const prevPage = currentPage > 1 ? currentPage - 1 : 1;
        items.push(`
            <li class="page-item ${prevDisabled}">
              <a href="#" class="page-link" data-page="${prevPage}">Anterior</a>
            </li>
          `);
    
        if (totalPages <= 7) {
            // Si hay 7 páginas o menos, mostrar todas
            for (let i = 1; i <= totalPages; i++) {
                const active = i === currentPage ? 'active' : '';
                items.push(`
                <li class="page-item ${active}">
                  <a href="#" class="page-link" data-page="${i}">${i}</a>
                </li>
              `);
            }
        } else {
            // Lógica compleja para muchas páginas
            if (currentPage <= 3) {
                // Primera páginas: 1 2 3 4 ... F
                for (let i = 1; i <= 4; i++) {
                    const active = i === currentPage ? 'active' : '';
                    items.push(`
                  <li class="page-item ${active}">
                    <a href="#" class="page-link" data-page="${i}">${i}</a>
                  </li>
                `);
                }
                items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
                items.push(`
                <li class="page-item">
                  <a href="#" class="page-link" data-page="${totalPages}">${totalPages}</a>
                </li>
              `);
            } else if (currentPage >= totalPages - 2) {
                // Últimas páginas: 1 ... F-3 F-2 F-1 F
                items.push(`
                <li class="page-item">
                  <a href="#" class="page-link" data-page="1">1</a>
                </li>
              `);
                items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    const active = i === currentPage ? 'active' : '';
                    items.push(`
                  <li class="page-item ${active}">
                    <a href="#" class="page-link" data-page="${i}">${i}</a>
                  </li>
                `);
                }
            } else {
                // Página intermedia: 1 ... x-1 x x+1 ... F
                items.push(`
                <li class="page-item">
                  <a href="#" class="page-link" data-page="1">1</a>
                </li>
              `);
                items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
    
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    const active = i === currentPage ? 'active' : '';
                    items.push(`
                  <li class="page-item ${active}">
                    <a href="#" class="page-link" data-page="${i}">${i}</a>
                  </li>
                `);
                }
    
                items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
                items.push(`
                <li class="page-item">
                  <a href="#" class="page-link" data-page="${totalPages}">${totalPages}</a>
                </li>
              `);
            }
        }
    
        // Botón siguiente
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;
        items.push(`
            <li class="page-item ${nextDisabled}">
              <a href="#" class="page-link" data-page="${nextPage}">Siguiente</a>
            </li>
          `);
    
        return items.join('');
    }

    showError(message) {
        const grid = document.getElementById('fishGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-12">
                  <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                  </div>
                </div>
              `;
        }
    }
}

// Función global para navegar a la página del pez
function navigateToFish(fishId) {
    // Aquí puedes pasar el ID como parámetro de URL o usar localStorage
    window.location.href = `peix.html?id=${fishId}`;
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new FishLibrary();
});

// Inicializar AOS (Animate On Scroll) si está disponible
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 600,
        easing: 'ease-in-out',
        once: true,
        mirror: false
    });
}