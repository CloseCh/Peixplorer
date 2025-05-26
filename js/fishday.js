/**
 * Fish of the Day functionality - Optimizado para carga rápida
 */
document.addEventListener('DOMContentLoaded', function () {
    // Debug mode - cambiar a false en producción
    const DEBUG = false;

    function logDebug(message, data) {
        if (DEBUG) {
            console.log(`[Fish of Day]: ${message}`, data || '');
        }
    }

    // Function to get a seed for random number generation based on the current date
    function getDateSeed() {
        const today = new Date();
        return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    }

    // Function to generate a random number based on a seed
    function seededRandom(seed) {
        let m = 2 ** 35 - 31;
        let a = 185852;
        let s = seed % m;
        return function () {
            return (s = s * a % m) / m;
        };
    }

    // Función recursiva optimizada para encontrar elementos finales
    function findLeafNodes(node, path = []) {
        const leaves = [];
        
        // Si el nodo tiene hasDefinedTerm, verificar si es una hoja
        if (node.hasDefinedTerm) {
            const hasValidChildren = node.childTaxon && 
                                   Array.isArray(node.childTaxon) && 
                                   node.childTaxon.length > 0 &&
                                   node.childTaxon.some(child => child.hasDefinedTerm);
            
            if (!hasValidChildren) {
                // Es una hoja, añadirla sin información extra innecesaria
                leaves.push(node);
                if (DEBUG) logDebug(`Hoja encontrada: ${node.hasDefinedTerm}`);
            }
        }

        // Continuar buscando en los hijos si existen
        if (node.childTaxon && Array.isArray(node.childTaxon)) {
            for (const child of node.childTaxon) {
                leaves.push(...findLeafNodes(child, path));
            }
        }

        return leaves;
    }

    // Función para intentar cargar imagen con diferentes formatos de nombre
    async function loadFishImage(fishImage, identifier, fishName) {
        if (!identifier) {
            fishImage.src = 'assets/img/placeholder-fish.webp';
            fishImage.alt = 'Pez del día';
            return;
        }

        // Intentar diferentes formatos de nombre de archivo
        const possibleFormats = [
            `01_${identifier}.webp`,
            `02_${identifier}.webp`,
            `${identifier}.webp`,
            `01_${identifier}.jpg`,
            `02_${identifier}.jpg`,
            `${identifier}.jpg`
        ];

        let imageLoaded = false;
        
        for (const format of possibleFormats) {
            const imagePath = `assets/img/fishes/${format}`;
            
            try {
                // Verificar si la imagen existe
                const response = await fetch(imagePath, { method: 'HEAD' });
                if (response.ok) {
                    fishImage.src = imagePath;
                    fishImage.alt = fishName;
                    imageLoaded = true;
                    logDebug(`Imagen cargada: ${imagePath}`);
                    break;
                }
            } catch (error) {
                // Continuar con el siguiente formato
                continue;
            }
        }

        // Si ninguna imagen se pudo cargar, usar placeholder
        if (!imageLoaded) {
            fishImage.src = 'assets/img/placeholder-fish.webp';
            fishImage.alt = 'Pez del día';
            logDebug('No se encontró imagen, usando placeholder');
        }
    }

    // Function to get a random fish based on the current date
    async function getFishOfTheDay() {
        try {
            logDebug('Iniciando carga del pez del día');

            // Rutas ajustadas según la estructura de carpetas
            const jsonPath = 'json/fish.json';

            // Fetch the fish data from the JSON file
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch fish data: ${response.status}`);
            }

            const data = await response.json();
            logDebug('JSON cargado correctamente');

            // Verificar estructura básica
            if (!data.itemListElement || !Array.isArray(data.itemListElement)) {
                throw new Error('Estructura de JSON inválida');
            }

            // Encontrar todos los elementos finales de forma optimizada
            let allFishes = [];
            
            for (const rootItem of data.itemListElement) {
                allFishes.push(...findLeafNodes(rootItem));
            }

            // Si no se encontraron peces, mostrar error
            if (allFishes.length === 0) {
                throw new Error('No se encontraron peces en el archivo JSON');
            }

            logDebug(`Total de peces encontrados: ${allFishes.length}`);

            // Use the date as a seed to get a consistent random fish for the day
            const seed = getDateSeed();
            const random = seededRandom(seed);
            const randomIndex = Math.floor(random() * allFishes.length);

            // Get the random fish
            const fishOfTheDay = allFishes[randomIndex];

            if (!fishOfTheDay) {
                throw new Error('No se pudo seleccionar el pez');
            }

            logDebug('Pez del día seleccionado:', fishOfTheDay.hasDefinedTerm);

            // Update the DOM with the fish information
            const fishName = fishOfTheDay.hasDefinedTerm || 'Nombre no disponible';
            const displayName = fishOfTheDay.alternateName ? 
                `${fishName} (${fishOfTheDay.alternateName})` : 
                fishName;
            
            document.getElementById('fish-name').textContent = displayName;
            
            // Procesar descripción para permitir saltos de línea
            const description = fishOfTheDay.description || 'Descripción no disponible';
            const descriptionElement = document.getElementById('fish-description');
            descriptionElement.innerHTML = description.replace(/\n/g, '<br>');

            // Extraer propiedades de forma optimizada
            let habitat = 'No disponible';
            let distribution = 'No disponible';
            let videoUrl = null;

            if (fishOfTheDay.additionalProperty) {
                for (const prop of fishOfTheDay.additionalProperty) {
                    switch (prop.name) {
                        case 'Habitat':
                            habitat = prop.value;
                            break;
                        case 'Distribución':
                            distribution = prop.value;
                            break;
                        case 'Video':
                            videoUrl = prop.value;
                            break;
                    }
                }
            }

            document.getElementById('fish-habitat').textContent = habitat;
            document.getElementById('fish-distribution').textContent = distribution;

            // Set up video link
            const videoLink = document.getElementById('fish-video-link');
            if (videoUrl) {
                videoLink.href = videoUrl;
                videoLink.style.display = 'inline-block';
            } else {
                videoLink.style.display = 'none';
            }

            // Set up fish image con nueva función de carga
            const fishImage = document.getElementById('fish-image');
            await loadFishImage(fishImage, fishOfTheDay.identifier, fishName);

            logDebug('Pez del día cargado correctamente');

        } catch (error) {
            console.error('Error loading fish of the day:', error);

            // Show error message in the UI
            document.getElementById('fish-name').textContent = 'Error al cargar el pez del día';
            document.getElementById('fish-description').textContent = 
                'Por favor, inténtalo de nuevo más tarde.';
            document.getElementById('fish-habitat').textContent = 'No disponible';
            document.getElementById('fish-distribution').textContent = 'No disponible';
            document.getElementById('fish-video-link').style.display = 'none';
            
            // Usar imagen de placeholder en caso de error
            document.getElementById('fish-image').src = 'assets/img/placeholder-fish.webp';
        }
    }

    // Mostrar mensajes de inicio solo en debug
    if (DEBUG) logDebug('Script iniciado - esperando a que cargue el DOM');

    // Load the fish of the day when the page loads
    getFishOfTheDay();
});