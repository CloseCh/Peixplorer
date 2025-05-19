/**
 * Fish of the Day functionality
 */
document.addEventListener('DOMContentLoaded', function () {
    // Debug mode
    const DEBUG = true;

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

    // Function to get a random fish based on the current date
    async function getFishOfTheDay() {
        try {
            logDebug('Iniciando carga del pez del día');

            // Rutas ajustadas según la estructura de carpetas
            const jsonPath = 'json/fish.json';

            // Fetch the fish data from the JSON file
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch fish data from ${jsonPath}: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            logDebug('JSON cargado correctamente');

            // Flatten the nested structure to get all fishes
            let allFishes = [];

            try {
                // Check if the structure is as expected
                if (!data.itemListElement || !Array.isArray(data.itemListElement)) {
                    throw new Error('Estructura de JSON inválida: itemListElement no encontrado o no es un array');
                }

                logDebug('Procesando estructura de datos', data.itemListElement.length + ' elementos en nivel 1');

                // Process each class
                data.itemListElement.forEach((classItem, i) => {
                    logDebug(`Procesando clase ${i}: ${classItem.hasDefinedTerm || 'unknown'}`);

                    if (classItem.childTaxon && Array.isArray(classItem.childTaxon)) {
                        // Process each subclass
                        classItem.childTaxon.forEach((subclassItem, j) => {
                            logDebug(`Procesando subclase ${i}.${j}: ${subclassItem.hasDefinedTerm || 'unknown'}`);

                            if (subclassItem.childTaxon && Array.isArray(subclassItem.childTaxon)) {
                                // Add all species to our list
                                logDebug(`Encontrados ${subclassItem.childTaxon.length} peces en subclase ${i}.${j}`);
                                subclassItem.childTaxon.forEach(fish => {
                                    if (fish.hasDefinedTerm) {
                                        allFishes.push(fish);
                                        logDebug(`Añadido pez: ${fish.hasDefinedTerm}`, fish);
                                    }
                                });
                            } else {
                                // If it's a leaf node (a fish without children)
                                if (subclassItem.hasDefinedTerm) {
                                    allFishes.push(subclassItem);
                                    logDebug(`Añadido pez (nivel subclase): ${subclassItem.hasDefinedTerm}`, subclassItem);
                                }
                            }
                        });
                    } else {
                        // If it's a leaf node (a fish without children)
                        if (classItem.hasDefinedTerm) {
                            allFishes.push(classItem);
                            logDebug(`Añadido pez (nivel clase): ${classItem.hasDefinedTerm}`, classItem);
                        }
                    }
                });
            } catch (parseError) {
                console.error('Error parsing fish data structure:', parseError);
                logDebug('Error al procesar estructura de datos:', parseError.message);

                // Fallback: try to find any objects with hasDefinedTerm
                logDebug('Intentando método alternativo para extraer peces');

                function findFishRecursive(obj) {
                    if (!obj || typeof obj !== 'object') return;

                    if (obj.hasDefinedTerm) {
                        allFishes.push(obj);
                        logDebug(`Añadido pez (método alternativo): ${obj.hasDefinedTerm}`);
                    }

                    for (const key in obj) {
                        if (Array.isArray(obj[key])) {
                            obj[key].forEach(item => findFishRecursive(item));
                        } else if (typeof obj[key] === 'object') {
                            findFishRecursive(obj[key]);
                        }
                    }
                }

                findFishRecursive(data);
            }

            // If no fish found, show error
            if (allFishes.length === 0) {
                throw new Error('No se encontraron peces en el archivo JSON');
            }

            logDebug(`Total de peces encontrados: ${allFishes.length}`);

            // Use the date as a seed to get a consistent random fish for the day
            const seed = getDateSeed();
            const random = seededRandom(seed);
            const randomIndex = Math.floor(random() * allFishes.length);

            logDebug(`Índice aleatorio generado: ${randomIndex} de ${allFishes.length}`);

            // Get the random fish
            const fishOfTheDay = allFishes[randomIndex];

            if (!fishOfTheDay) {
                throw new Error(`No se pudo seleccionar el pez. Índice: ${randomIndex}, Total peces: ${allFishes.length}`);
            }

            logDebug('Pez del día seleccionado:', fishOfTheDay);

            // Update the DOM with the fish information
            document.getElementById('fish-name').textContent = fishOfTheDay.hasDefinedTerm || 'Nombre no disponible';

            if (fishOfTheDay.alternateName) {
                document.getElementById('fish-name').textContent += ` (${fishOfTheDay.alternateName})`;
            }

            document.getElementById('fish-description').textContent = fishOfTheDay.description || 'Descripción no disponible';

            // Set habitat and distribution if available
            let habitat = 'No disponible';
            let distribution = 'No disponible';
            let videoUrl = null;

            if (fishOfTheDay.additionalProperty && Array.isArray(fishOfTheDay.additionalProperty)) {
                fishOfTheDay.additionalProperty.forEach(prop => {
                    if (prop.name === 'Habitat') {
                        habitat = prop.value;
                    } else if (prop.name === 'Distribución') {
                        distribution = prop.value;
                    } else if (prop.name === 'Video') {
                        videoUrl = prop.value;
                    }
                });
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

            // Set up fish image - rutas ajustadas según la estructura de carpetas
            const fishImage = document.getElementById('fish-image');
            if (fishOfTheDay.identifier) {
                const imagePath = `assets/img/fishes/${fishOfTheDay.identifier}.jpg`;
                logDebug(`Intentando cargar imagen: ${imagePath}`);

                fishImage.src = imagePath;
                fishImage.alt = fishOfTheDay.hasDefinedTerm || 'Pez del día';

                // Handle missing image with an error handler
                fishImage.onerror = function () {
                    logDebug(`Error al cargar imagen: ${imagePath}, usando placeholder`);
                    this.src = 'assets/img/placeholder-fish.jpg';
                };
            } else {
                logDebug('No se encontró ID para el pez, usando placeholder');
                fishImage.src = 'assets/img/placeholder-fish.jpg';
            }

            logDebug('Pez del día cargado correctamente');

        } catch (error) {
            console.error('Error loading fish of the day:', error);
            logDebug('Error crítico:', error.message);

            // Show error message in the UI
            document.getElementById('fish-name').textContent = 'Error al cargar el pez del día';
            document.getElementById('fish-description').textContent = 'Por favor, inténtalo de nuevo más tarde o contacta con el administrador.';
            document.getElementById('fish-habitat').textContent = 'No disponible';
            document.getElementById('fish-distribution').textContent = 'No disponible';
            document.getElementById('fish-video-link').style.display = 'none';
        }
    }

    // Mostrar mensajes de inicio
    logDebug('Script iniciado - esperando a que cargue el DOM');

    // Load the fish of the day when the page loads
    getFishOfTheDay();
});