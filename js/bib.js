// =============================================
// SPEECH SYNTHESIS API - FUNCIONALIDAD ADICIONAL
// =============================================
class ChunkedSpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isPlaying = false;
    this.isPaused = false;
    this.voices = [];
    this.selectedVoice = null;
    
    // Propiedades para chunks
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.currentUtterance = null;
    this.fullText = '';
    
    // Configuración
    this.chunkSize = 150; // Caracteres por chunk
    this.pauseBetweenChunks = 50; // ms entre chunks
    
    this.init();
  }

  init() {
    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    this.selectedVoice = this.voices.find(voice =>
      voice.lang.startsWith('es') && voice.localService
    ) || this.voices.find(voice =>
      voice.lang.startsWith('es')
    ) || this.voices[0];

    console.log('🎤 Voces disponibles:', this.voices.length);
    console.log('🗣️ Voz seleccionada:', this.selectedVoice?.name);
  }

  // Dividir texto en chunks inteligentes (respetando oraciones)
  splitTextIntoChunks(text) {
    const chunks = [];
    let currentChunk = '';
    
    // Dividir por oraciones primero
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      
      // Si la oración es muy larga, dividirla por comas
      if (cleanSentence.length > this.chunkSize) {
        const parts = cleanSentence.split(',');
        
        for (const part of parts) {
          const cleanPart = part.trim();
          
          if (currentChunk.length + cleanPart.length > this.chunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = cleanPart;
          } else {
            currentChunk += (currentChunk ? ', ' : '') + cleanPart;
          }
        }
      } else {
        // Oración normal
        if (currentChunk.length + cleanSentence.length > this.chunkSize && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = cleanSentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + cleanSentence;
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  speak(text, options = {}) {
    console.log('🎤 Iniciando speech con chunks...');
    
    this.stop(); // Limpiar cualquier speech anterior
    
    if (!text || text.trim() === '') {
      console.warn('⚠️ No hay texto para sintetizar');
      return;
    }

    this.fullText = text;
    this.chunks = this.splitTextIntoChunks(text);
    this.currentChunkIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    
    console.log(`📝 Texto dividido en ${this.chunks.length} chunks:`);
    this.chunks.forEach((chunk, i) => {
      console.log(`  ${i + 1}: "${chunk.substring(0, 50)}..."`);
    });
    
    this.updatePlayButton('playing');
    this.speakNextChunk();
  }

  speakNextChunk() {
    // Verificar si hemos terminado
    if (this.currentChunkIndex >= this.chunks.length) {
      this.onSpeechComplete();
      return;
    }
    
    // Verificar si estamos pausados
    if (this.isPaused) {
      console.log(`⏸️ Speech pausado en chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`);
      return;
    }
    
    const chunk = this.chunks[this.currentChunkIndex];
    console.log(`🗣️ Hablando chunk ${this.currentChunkIndex + 1}/${this.chunks.length}: "${chunk.substring(0, 30)}..."`);
    
    // Crear utterance para este chunk
    this.currentUtterance = new SpeechSynthesisUtterance(chunk);
    this.currentUtterance.voice = this.selectedVoice;
    this.currentUtterance.lang = 'es-ES';
    this.currentUtterance.rate = 0.9;
    this.currentUtterance.pitch = 1;
    this.currentUtterance.volume = 0.8;

    // Event listeners
    this.currentUtterance.onstart = () => {
      console.log(`✅ Chunk ${this.currentChunkIndex + 1} iniciado`);
    };

    this.currentUtterance.onend = () => {
      console.log(`🏁 Chunk ${this.currentChunkIndex + 1} terminado`);
      
      if (!this.isPaused) {
        this.currentChunkIndex++;
        
        // Pequeña pausa entre chunks para naturalidad
        setTimeout(() => {
          this.speakNextChunk();
        }, this.pauseBetweenChunks);
      }
    };

    this.currentUtterance.onerror = (event) => {
      console.log(`⚠️ Evento error en chunk ${this.currentChunkIndex + 1}: ${event.error}`);
      
      // Solo avanzar al siguiente chunk si NO es una pausa intencional
      if (event.error === 'canceled' || event.error === 'interrupted') {
        if (this.isPaused) {
          console.log('✅ Error por pausa intencional - NO avanzar chunk');
          return; // No hacer nada si es pausa intencional
        } else {
          console.log('⚠️ Speech cancelado pero no estamos pausados - continuar');
        }
      }
      
      // Solo para errores reales (network-error, synthesis-failed, etc.)
      console.error(`❌ Error real en chunk ${this.currentChunkIndex + 1}:`, event.error);
      this.currentChunkIndex++;
      setTimeout(() => {
        this.speakNextChunk();
      }, 200);
    };

    // Hablar el chunk
    try {
      this.synth.speak(this.currentUtterance);
    } catch (error) {
      console.error('💥 Error al hablar chunk:', error);
      this.currentChunkIndex++;
      setTimeout(() => {
        this.speakNextChunk();
      }, 200);
    }
  }

  pause() {
    console.log(`⏸️ Pausando en chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`);
    
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      
      // Cancelar el utterance actual
      this.synth.cancel();
      
      this.updatePlayButton('paused');
      console.log('✅ Speech pausado exitosamente');
    }
  }

  resume() {
    console.log(`▶️ Reanudando desde chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`);
    
    if (this.isPlaying && this.isPaused) {
      this.isPaused = false;
      this.updatePlayButton('playing');
      
      // Continuar desde el chunk actual
      this.speakNextChunk();
      console.log('✅ Speech reanudado exitosamente');
    }
  }

  stop() {
    console.log('🛑 Deteniendo speech completamente');
    
    try {
      this.synth.cancel();
    } catch (error) {
      console.error('Error deteniendo:', error);
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;
    this.chunks = [];
    this.currentUtterance = null;
    this.updatePlayButton('stopped');
  }

  toggle() {
    console.log('🔄 Toggle llamado. Estado:', {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentChunk: this.currentChunkIndex + 1,
      totalChunks: this.chunks.length
    });

    if (!this.isPlaying) {
      // Iniciar nueva síntesis
      const descriptionText = document.querySelector('.fish-description p')?.textContent;
      if (descriptionText && descriptionText.trim()) {
        this.speak(descriptionText.trim());
      } else {
        console.error('❌ No se encontró texto de descripción');
        alert('No se encontró texto para leer');
      }
    } else if (this.isPaused) {
      // Reanudar
      this.resume();
    } else {
      // Pausar
      this.pause();
    }
  }

  onSpeechComplete() {
    console.log('🎉 ¡Speech completado exitosamente!');
    this.isPlaying = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;
    this.updatePlayButton('stopped');
  }

  updatePlayButton(state) {
    console.log('🎨 Actualizando botón a estado:', state);
    
    const playButton = document.getElementById('speechPlayButton');
    const icon = playButton?.querySelector('i');
    const text = playButton?.querySelector('.button-text');

    if (!playButton) {
      console.warn('⚠️ Botón de speech no encontrado');
      return;
    }

    // Limpiar clases anteriores
    playButton.className = 'btn btn-outline-primary btn-sm speech-btn';

    switch (state) {
      case 'playing':
        playButton.classList.add('playing');
        if (icon) icon.className = 'bi bi-pause-fill';
        if (text) text.textContent = 'Pausar';
        playButton.disabled = false;
        break;

      case 'paused':
        playButton.classList.add('paused');
        if (icon) icon.className = 'bi bi-play-fill';
        if (text) text.textContent = 'Continuar';
        playButton.disabled = false;
        break;

      case 'stopped':
        if (icon) icon.className = 'bi bi-volume-up-fill';
        if (text) text.textContent = 'Escuchar';
        playButton.disabled = false;
        break;

      case 'error':
        playButton.classList.add('error');
        if (icon) icon.className = 'bi bi-exclamation-triangle';
        if (text) text.textContent = 'Error';
        playButton.disabled = true;
        break;
    }
  }

  // Métodos de información
  isSupported() {
    return 'speechSynthesis' in window;
  }

  getStatus() {
    return {
      isSupported: this.isSupported(),
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      totalChunks: this.chunks.length,
      currentChunk: this.currentChunkIndex + 1,
      progress: this.chunks.length > 0 ? ((this.currentChunkIndex / this.chunks.length) * 100).toFixed(1) + '%' : '0%',
      voicesCount: this.voices.length,
      selectedVoice: this.selectedVoice?.name,
      textLength: this.fullText.length
    };
  }

  getDetailedStatus() {
    return {
      // Estados internos
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      chunkSize: this.chunkSize,
      
      // Estados del navegador
      synthSpeaking: this.synth.speaking,
      synthPaused: this.synth.paused,
      synthPending: this.synth.pending,
      
      // Configuración
      voicesCount: this.voices.length,
      selectedVoice: this.selectedVoice?.name,
      isSupported: this.isSupported(),
      
      // Contenido
      fullTextLength: this.fullText.length,
      chunks: this.chunks.map((chunk, i) => ({
        index: i + 1,
        length: chunk.length,
        preview: chunk.substring(0, 30) + '...'
      })),
      
      // Elementos DOM
      buttonExists: !!document.getElementById('speechPlayButton'),
      textExists: !!document.querySelector('.fish-description p')?.textContent
    };
  }

  // Método para testing
  testWithText(text = 'Esta es una prueba de síntesis de voz por chunks. Cada fragmento se habla de manera independiente. Esto garantiza que el pausar y reanudar funcione correctamente.') {
    console.log('🧪 Ejecutando test con chunks...');
    this.speak(text);
    
    // Mostrar información después de 1 segundo
    setTimeout(() => {
      console.log('📊 Estado del test:', this.getStatus());
    }, 1000);
  }

  // Método para debugging
  debug() {
    console.log('=== DEBUG CHUNKED SPEECH MANAGER ===');
    console.log('Status:', this.getStatus());
    console.log('Detailed Status:', this.getDetailedStatus());
    return this.getDetailedStatus();
  }
}

// =============================================
// SISTEMA DE EVENTOS PERSONALIZADO
// =============================================
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

// =============================================
// CACHE MANAGER PARA OPTIMIZACIÓN
// =============================================
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 5 * 60 * 1000; // 5 minutos
  }

  set(key, value) {
    // Limpiar cache si está lleno
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Verificar TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// =============================================
// CLASE PRINCIPAL - BIBLIOTECA DE PECES
// =============================================
class ImprovedFishLibrary extends EventEmitter {
  constructor() {
    super();

    // Estado de la aplicación
    this.state = {
      allFish: [],
      filteredFish: [],
      currentPage: 1,
      itemsPerPage: CONFIG.itemsPerPage,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      sortBy: 'name',
      sortOrder: 'asc',
      filters: {
        family: '',
        habitat: '',
        search: ''
      }
    };

    // Managers y utilidades
    this.cache = new CacheManager();
    this.elements = {};
    this.swiper = null;
    this.retryCount = 0;

    if ('speechSynthesis' in window) {
      speechManager = new ChunkedSpeechManager();
    }

    // Bind de métodos
    this.handleCardClick = this.handleCardClick.bind(this);
    this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
    this.handleModalKeydown = this.handleModalKeydown.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);

    // Inicialización
    this.init();
  }

  // =============================================
  // INICIALIZACIÓN
  // =============================================
  async init() {
    try {
      console.log('🚀 Inicializando Biblioteca de Peces...');

      this.cacheElements();
      this.setupEventListeners();

      await this.loadFishData();

      this.setState({ isLoading: false });
      this.render();

      console.log('✅ Biblioteca inicializada correctamente');
      this.emit('libraryReady', this.getStats());

    } catch (error) {
      console.error('❌ Error inicializando la biblioteca:', error);
      this.handleError(error.message);
    }
  }

  /**
   * Cache de elementos DOM para optimización
   */
  cacheElements() {
    this.elements = {
      loader: document.getElementById('loader'),
      fishGrid: document.getElementById('fishGrid'),
      pagination: document.getElementById('pagination'),
      resultsInfo: document.getElementById('resultsInfo'),
      emptyState: document.getElementById('emptyState'),
      errorState: document.getElementById('errorState'),
      modal: document.getElementById('fishModal'),
      modalTitle: document.getElementById('fishModalLabel'),
      modalBody: document.getElementById('fishModalBody'),
      sortSelect: document.getElementById('sortSelect'),
      libraryControls: document.getElementById('libraryControls')
    };

    // Verificar elementos críticos
    const criticalElements = ['fishGrid', 'pagination'];
    const missingElements = criticalElements.filter(id => !this.elements[id]);

    if (missingElements.length > 0) {
      throw new Error(`Elementos críticos no encontrados: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Event delegation para clicks en cards
    if (this.elements.fishGrid) {
      this.elements.fishGrid.addEventListener('click', this.handleCardClick);
      this.elements.fishGrid.addEventListener('keydown', this.handleKeyboardNavigation);
    }

    // Sort controls
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', this.handleSortChange);
    }

    // Modal events
    if (this.elements.modal) {
      this.elements.modal.addEventListener('keydown', this.handleModalKeydown);

      // Bootstrap modal events
      this.elements.modal.addEventListener('shown.bs.modal', () => {
        this.initializeSwiper();
        this.emit('modalOpened');
      });

      this.elements.modal.addEventListener('hidden.bs.modal', () => {
        this.cleanupSwiper();
        this.emit('modalClosed');
      });
    }

    // Global events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });

    // Resize handler con debounce
    window.addEventListener('resize', Utils.debounce(() => {
      this.handleResize();
    }, 250));

    // Visibility change para pausar/reanudar animaciones
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAnimations();
      } else {
        this.resumeAnimations();
      }
    });
  }

  // =============================================
  // GESTIÓN DE ESTADO
  // =============================================
  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Emit change event
    this.emit('stateChanged', { prevState, currentState: this.state });

    // Auto-render en cambios críticos
    const criticalProps = ['filteredFish', 'currentPage', 'isLoading', 'hasError'];
    const hasChange = criticalProps.some(prop => prevState[prop] !== this.state[prop]);

    if (hasChange) {
      this.render();
    }
  }

  /**
   * Obtener estado actual
   */
  getState() {
    return { ...this.state };
  }

  // =============================================
  // CARGA DE DATOS
  // =============================================
  async loadFishData() {
    this.setState({ isLoading: true, hasError: false });

    try {
      // Intentar cargar desde API/JSON primero
      let fishData = await this.fetchFishDataFromAPI();

      // Fallback a datos de ejemplo si falla
      if (!fishData || fishData.length === 0) {
        console.warn('⚠️ No se pudieron cargar datos de la API, usando datos de ejemplo');
        fishData = SAMPLE_FISH_DATA;
      }

      this.setState({
        allFish: fishData,
        filteredFish: [...fishData],
        isLoading: false
      });

      console.log(`✅ Cargados ${fishData.length} peces exitosamente`);
      this.retryCount = 0;

    } catch (error) {
      console.error('❌ Error cargando datos:', error);

      if (this.retryCount < CONFIG.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Reintentando... (${this.retryCount}/${CONFIG.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * this.retryCount));
        return this.loadFishData();
      }

      this.handleError('Error al cargar los datos de peces');
    }
  }

  /**
   * Cargar datos desde API/JSON
   */
  async fetchFishDataFromAPI() {
    const cachedData = this.cache.get('fishData');
    if (cachedData) {
      console.log('📦 Usando datos desde cache');
      return cachedData;
    }

    try {
      const response = await fetch(CONFIG.apiEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const fishArray = this.extractFishFromData(data);

      // Cache successful response
      this.cache.set('fishData', fishArray);

      return fishArray;

    } catch (error) {
      console.warn('⚠️ API no disponible, usando datos de ejemplo:', error.message);
      return SAMPLE_FISH_DATA;
    }
  }

  /**
   * Extraer peces de la estructura de datos JSON
   */
  extractFishFromData(data) {
    const fish = [];
    const familyMap = new Map();

    // Crear mapa de familias
    if (data.itemListElement) {
      data.itemListElement.forEach(family => {
        if (family.alternateName) {
          familyMap.set(family.identifier, family.alternateName);
        }
      });
    }

    // Función recursiva para extraer peces
    const extractRecursive = (items, familyName = 'Sin clasificar') => {
      if (!items || !Array.isArray(items)) return;

      items.forEach(item => {
        if (item['@type'] === 'Taxon') {
          const isIntermediateNode = item.name && [
            'clase', 'subclase', 'orden', 'suborden',
            'familia', 'subfamilia', 'género', 'subgénero'
          ].includes(item.name);

          if (item.hasDefinedTerm && item.alternateName && !isIntermediateNode) {
            const properties = {};
            if (item.additionalProperty) {
              item.additionalProperty.forEach(prop => {
                properties[prop.name] = prop.value;
              });
            }

            const fishId = item.identifier ? item.identifier.toString() : `fish_${fish.length}`;

            fish.push({
              id: fishId,
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

          const currentFamily = familyMap.get(item.identifier) || familyName;
          if (item.childTaxon) {
            extractRecursive(item.childTaxon, currentFamily);
          }
        }
      });
    };

    // Procesar datos
    if (data.itemListElement) {
      extractRecursive(data.itemListElement);
    }

    return fish;
  }

  /**
   * Cargar datos de ejemplo (fallback)
   */
  loadSampleData() {
    console.log('📊 Cargando datos de ejemplo...');
    this.setState({
      allFish: SAMPLE_FISH_DATA,
      filteredFish: [...SAMPLE_FISH_DATA],
      hasError: false,
      currentPage: 1
    });

    this.emit('dataLoaded', { source: 'sample', count: SAMPLE_FISH_DATA.length });
  }

  // =============================================
  // RENDERIZADO
  // =============================================
  render() {
    if (this.state.isLoading) {
      this.showLoader();
      return;
    }

    this.hideLoader();
    this.renderResultsInfo();
    this.renderFishGrid();
    this.renderPagination();
  }

  showLoader() {
    this.elements.loader?.classList.add('show');
  }

  hideLoader() {
    this.elements.loader?.classList.remove('show');
  }

  renderResultsInfo() {
    if (!this.elements.resultsInfo) return;

    const total = this.state.filteredFish.length;
    const start = (this.state.currentPage - 1) * this.state.itemsPerPage + 1;
    const end = Math.min(this.state.currentPage * this.state.itemsPerPage, total);

    if (total > 0) {
      this.elements.resultsInfo.textContent =
        `Mostrando ${Utils.formatNumber(start)}-${Utils.formatNumber(end)} de ${Utils.formatNumber(total)} peces`;
      this.elements.resultsInfo.style.display = 'block';
    } else {
      this.elements.resultsInfo.style.display = 'none';
    }
  }

  renderFishGrid() {
    if (!this.elements.fishGrid) return;

    // Estados de error y vacío
    if (this.state.hasError) {
      this.showErrorState();
      return;
    }

    if (this.state.filteredFish.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideStates();

    // Calcular elementos de la página actual
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = startIndex + this.state.itemsPerPage;
    const pageItems = this.state.filteredFish.slice(startIndex, endIndex);

    // Debug para verificar el layout
    console.log(`🎯 Renderizando ${pageItems.length} cards en grid de 3 columnas`);

    // Renderizar grid usando CSS Grid nativo (3 columnas exactas)
    const gridHTML = pageItems.map(fish => this.createFishCard(fish)).join('');
    this.elements.fishGrid.innerHTML = gridHTML;

    // Forzar recálculo del layout después de un frame
    requestAnimationFrame(() => {
      this.elements.fishGrid.style.display = 'grid';

      // Debug del layout aplicado
      const computedStyle = window.getComputedStyle(this.elements.fishGrid);
      console.log('📐 Grid columns aplicadas:', computedStyle.gridTemplateColumns);
    });

    // Lazy load de imágenes
    this.setupLazyLoading();
  }

  createFishCard(fish) {
    const imagePath = Utils.getFishImagePath(fish.id);
    const cardId = `fish-card-${fish.id}`;

    return `
    <article class="card h-100 fish-card" 
             data-fish-id="${fish.id}" 
             id="${cardId}"
             role="button" 
             tabindex="0"
             aria-label="Ver información de ${Utils.escapeHtml(fish.commonName)}">
      <img class="card-img-top" 
           src="${imagePath}" 
           alt="${Utils.escapeHtml(fish.commonName)} (${Utils.escapeHtml(fish.scientificName)})"
           loading="lazy"
           onerror="this.src='${CONFIG.fallbackImage}'; this.style.objectFit='contain';" />
      <div class="card-body p-4">
        <div class="text-center">
          <h5 class="fw-bolder">${Utils.escapeHtml(fish.commonName)}</h5>
          <p class="text-muted fst-italic">${Utils.escapeHtml(fish.scientificName)}</p>
          ${fish.family ? `<small class="text-primary">Familia: ${Utils.escapeHtml(fish.family)}</small>` : ''}
        </div>
      </div>
    </article>
  `;
  }

  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  showErrorState() {
    this.elements.fishGrid.style.display = 'none';

    if (this.elements.errorState) {
      this.elements.errorState.style.display = 'flex';
      this.elements.errorState.classList.add('show');
    }

    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'none';
      this.elements.emptyState.classList.remove('show');
    }
  }

  showEmptyState() {
    this.elements.fishGrid.style.display = 'none';

    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'flex';
      this.elements.emptyState.classList.add('show');
    }

    if (this.elements.errorState) {
      this.elements.errorState.style.display = 'none';
      this.elements.errorState.classList.remove('show');
    }
  }

  hideStates() {
    this.elements.fishGrid.style.display = 'grid';

    if (this.elements.errorState) {
      this.elements.errorState.style.display = 'none';
      this.elements.errorState.classList.remove('show');
    }

    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'none';
      this.elements.emptyState.classList.remove('show');
    }
  }

  // =============================================
  // PAGINACIÓN
  // =============================================
  renderPagination() {
    if (!this.elements.pagination) return;

    const totalPages = Math.ceil(this.state.filteredFish.length / this.state.itemsPerPage);

    if (totalPages <= 1) {
      this.elements.pagination.innerHTML = '';
      return;
    }

    const paginationHTML = this.generatePaginationHTML(this.state.currentPage, totalPages);
    this.elements.pagination.innerHTML = paginationHTML;

    // Event listeners para botones de paginación
    this.elements.pagination.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.state.currentPage) {
          this.goToPage(page);
        }
      });
    });
  }

  generatePaginationHTML(currentPage, totalPages) {
    const items = [];

    // Botón anterior
    const prevDisabled = currentPage === 1;
    const prevPage = currentPage > 1 ? currentPage - 1 : 1;
    items.push(`
    <li class="page-item ${prevDisabled ? 'disabled' : ''}">
      <a href="#" class="page-link" data-page="${prevPage}" aria-label="Página anterior">
        <i class="bi bi-chevron-left"></i> Anterior
      </a>
    </li>
  `);

    // Lógica de páginas
    const { start, end } = this.calculatePageRange(currentPage, totalPages);

    if (start > 1) {
      items.push(`<li class="page-item"><a href="#" class="page-link" data-page="1">1</a></li>`);
      if (start > 2) {
        items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
      }
    }

    for (let i = start; i <= end; i++) {
      const active = i === currentPage ? 'active' : '';
      items.push(`
      <li class="page-item ${active}">
        <a href="#" class="page-link" data-page="${i}" 
           aria-label="Página ${i}" ${active ? 'aria-current="page"' : ''}>${i}</a>
      </li>
    `);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        items.push(`<li class="page-item"><span class="page-link">...</span></li>`);
      }
      items.push(`<li class="page-item"><a href="#" class="page-link" data-page="${totalPages}">${totalPages}</a></li>`);
    }

    // Botón siguiente
    const nextDisabled = currentPage === totalPages;
    const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;
    items.push(`
    <li class="page-item ${nextDisabled ? 'disabled' : ''}">
      <a href="#" class="page-link" data-page="${nextPage}" aria-label="Página siguiente">
        Siguiente <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `);

    return items.join('');
  }

  calculatePageRange(current, total) {
    const delta = 2;
    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);

    if (current <= delta + 1) {
      end = Math.min(total, delta * 2 + 1);
    }

    if (current >= total - delta) {
      start = Math.max(1, total - delta * 2);
    }

    return { start, end };
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.state.filteredFish.length / this.state.itemsPerPage);

    if (page < 1 || page > totalPages || page === this.state.currentPage) {
      return;
    }

    this.setState({ currentPage: page });

    // Scroll suave al inicio de la sección
    const section = document.getElementById('service-details');
    if (section) {
      Utils.smoothScrollTo(section, 80);
    }

    this.emit('pageChanged', { page, totalPages });
  }

  // =============================================
  // MODAL
  // =============================================
  showFishModal(fishId) {
    const fish = this.state.allFish.find(f => f.id === fishId);

    if (!fish) {
      console.error(`❌ Pez con ID ${fishId} no encontrado`);
      this.showNotification('Pez no encontrado', 'error');
      return;
    }

    console.log('🐠 Mostrando modal para:', fish.commonName);
    this.renderModalContent(fish);

    // Mostrar modal usando Bootstrap
    const modal = new bootstrap.Modal(this.elements.modal);
    modal.show();

    this.emit('fishModalOpened', fish);
  }

  renderModalContent(fish) {
    if (!this.elements.modalTitle || !this.elements.modalBody) return;

    this.elements.modalTitle.textContent = fish.commonName;

    // Generar rutas de imágenes
    const imagePaths = [
      Utils.getFishImagePath(fish.id, '01_'),
      Utils.getFishImagePath(fish.id, '02_'),
      Utils.getFishImagePath(fish.id, '03_')
    ];

    // Extraer ID de YouTube si existe
    const youtubeId = Utils.extractYouTubeId(fish.video);

    // Crear slides para el swiper
    const swiperSlides = imagePaths.map((imagePath, index) => {
      if (index === 2 && youtubeId) {
        // Tercer slide con video de YouTube
        return `
          <div class="swiper-slide">
            <div class="youtube-container" data-youtube-id="${youtubeId}">
              <img src="https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg" 
                   class="youtube-thumbnail" 
                   alt="${Utils.escapeHtml(fish.commonName)} - Video"
                   onerror="this.src='${CONFIG.fallbackImage}';">
              <div class="pulsating-play-btn" onclick="fishLibrary.loadYouTubeVideo('${youtubeId}', this.parentElement)">
                <i class="bi bi-play-fill"></i>
              </div>
            </div>
          </div>
        `;
      } else {
        // Slides normales de imágenes
        return `
          <div class="swiper-slide">
            <img src="${imagePath}" 
                 alt="${Utils.escapeHtml(fish.commonName)} - Imagen ${index + 1}" 
                 onerror="this.src='${CONFIG.fallbackImage}'; this.style.objectFit='contain';">
          </div>
        `;
      }
    }).join('');

    // Verificar si Speech Synthesis está disponible
    const speechSupported = speechManager && speechManager.isSupported();
    const speechButtonHTML = speechSupported ? `
      <div class="speech-controls mb-3">
        <button id="speechPlayButton" class="btn btn-outline-primary btn-sm speech-btn" onclick="toggleSpeech()">
          <i class="bi bi-volume-up-fill"></i>
          <span class="button-text">Escuchar</span>
        </button>
        <small class="text-muted ms-2">Escucha la descripción en audio</small>
      </div>
    ` : '';

    this.elements.modalBody.innerHTML = `
      <!-- Sección de imágenes con slider -->
      <div class="fish-image-section">
        <div class="fish-details-slider swiper">
          <div class="swiper-wrapper">
            ${swiperSlides}
          </div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button-prev"></div>
          <div class="swiper-button-next"></div>
        </div>
      </div>
      
      <!-- Información del pez -->
      <div class="fish-info-section">
        <div class="fish-info-grid">
          <!-- Columna izquierda -->
          <div class="fish-basic-info">
            <div class="fish-names">
              <h4>${Utils.escapeHtml(fish.commonName)}</h4>
              <p>${Utils.escapeHtml(fish.scientificName)}</p>
            </div>
            
            ${fish.family ? `
              <div class="info-item">
                <h6><i class="bi bi-collection"></i>Familia</h6>
                <p>${Utils.escapeHtml(fish.family)}</p>
              </div>
            ` : ''}
            
            ${fish.habitat ? `
              <div class="info-item">
                <h6><i class="bi bi-geo-alt"></i>Hábitat</h6>
                <p>${Utils.escapeHtml(fish.habitat)}</p>
              </div>
            ` : ''}
            
            ${fish.distribution ? `
              <div class="info-item">
                <h6><i class="bi bi-globe"></i>Distribución</h6>
                <p>${Utils.escapeHtml(fish.distribution)}</p>
              </div>
            ` : ''}
            
            ${(fish.wikipedia || fish.video) ? `
              <div class="info-item">
                <h6><i class="bi bi-link-45deg"></i>Enlaces externos</h6>
                <div class="external-links">
                  ${fish.wikipedia ? `
                    <a href="${fish.wikipedia}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                      <i class="bi bi-wikipedia"></i> Wikipedia
                    </a>
                  ` : ''}
                  ${fish.video ? `
                    <a href="${fish.video}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                      <i class="bi bi-play-circle"></i> YouTube
                    </a>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- Columna derecha -->
          <div class="fish-description">
            <h6><i class="bi bi-info-circle"></i>Descripción</h6>
            ${speechButtonHTML}
            <p>${Utils.escapeHtml(fish.description || 'No hay descripción disponible para esta especie.')}</p>
          </div>
        </div>
      </div>
    `;
  }

  loadYouTubeVideo(videoId, container) {
    if (!videoId || !container) return;

    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'youtube-player';

    // Animación de transición
    const thumbnail = container.querySelector('.youtube-thumbnail');
    const playButton = container.querySelector('.pulsating-play-btn');

    if (thumbnail) thumbnail.style.opacity = '0';
    if (playButton) playButton.style.opacity = '0';

    setTimeout(() => {
      container.innerHTML = '';
      container.appendChild(iframe);
    }, 300);

    this.emit('videoLoaded', { videoId });
  }

  initializeSwiper() {
    if (typeof Swiper === 'undefined') {
      console.warn('⚠️ Swiper no disponible');
      return;
    }

    const swiperElement = this.elements.modalBody?.querySelector('.fish-details-slider');
    if (swiperElement && !swiperElement.swiper) {
      this.swiper = new Swiper(swiperElement, {
        loop: true,
        speed: 600,
        autoplay: {
          delay: 5000,
          disableOnInteraction: true
        },
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 20,
        pagination: {
          el: '.swiper-pagination',
          type: 'bullets',
          clickable: true
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        on: {
          slideChange: () => {
            // Pausar videos cuando se cambia de slide
            const videos = this.elements.modalBody?.querySelectorAll('.youtube-player');
            videos?.forEach(video => {
              const src = video.src;
              video.src = src.replace('autoplay=1', 'autoplay=0');
            });
          }
        }
      });
    }
  }

  cleanupSwiper() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    if (speechManager) {
      speechManager.stop();
    }
  }

  closeModal() {
    const modal = bootstrap.Modal.getInstance(this.elements.modal);
    if (modal) {
      modal.hide();
    }
  }

  isModalOpen() {
    return this.elements.modal?.classList.contains('show');
  }

  // =============================================
  // EVENT HANDLERS
  // =============================================
  handleCardClick(e) {
    const card = e.target.closest('.fish-card');
    if (!card) return;

    const fishId = card.dataset.fishId;
    this.showFishModal(fishId);

    // Analytics
    this.emit('cardClicked', { fishId });
  }

  handleKeyboardNavigation(e) {
    const card = e.target.closest('.fish-card');
    if (!card) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const fishId = card.dataset.fishId;
      this.showFishModal(fishId);
    }

    // Navegación con flechas
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' ||
      e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigateCards(e.key, card);
    }
  }

  navigateCards(direction, currentCard) {
    const cards = Array.from(this.elements.fishGrid.querySelectorAll('.fish-card'));
    const currentIndex = cards.indexOf(currentCard);
    let nextIndex;

    const cardsPerRow = 3; // Exactamente 3 cards por fila

    switch (direction) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, cards.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + cardsPerRow, cards.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - cardsPerRow, 0);
        break;
      default:
        return;
    }

    if (cards[nextIndex]) {
      cards[nextIndex].focus();
    }
  }

  handleModalKeydown(e) {
    if (e.key === 'Escape') {
      this.closeModal();
    }

    // Navegación en el modal
    if (e.key === 'ArrowLeft' && this.swiper) {
      this.swiper.slidePrev();
    }
    if (e.key === 'ArrowRight' && this.swiper) {
      this.swiper.slideNext();
    }
  }

  handleSortChange(e) {
    const [sortBy, sortOrder] = e.target.value.split(':');
    this.setState({
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      currentPage: 1
    });

    this.applySorting();
    this.emit('sortChanged', { sortBy, sortOrder });
  }

  handleResize() {
    if (this.swiper) {
      this.swiper.update();
    }

    this.emit('windowResized', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  // =============================================
  // FILTRADO Y ORDENACIÓN
  // =============================================
  applySorting() {
    const { sortBy, sortOrder } = this.state;

    this.setState({
      filteredFish: [...this.state.filteredFish].sort((a, b) => {
        let aVal, bVal;

        switch (sortBy) {
          case 'name':
            aVal = a.commonName.toLowerCase();
            bVal = b.commonName.toLowerCase();
            break;
          case 'scientific':
            aVal = a.scientificName.toLowerCase();
            bVal = b.scientificName.toLowerCase();
            break;
          case 'family':
            aVal = a.family?.toLowerCase() || '';
            bVal = b.family?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      })
    });
  }

  filterFish(searchTerm = '', filters = {}) {
    const { search = searchTerm, family = '', habitat = '' } = { ...this.state.filters, ...filters };

    const filtered = this.state.allFish.filter(fish => {
      const matchesSearch = !search ||
        fish.commonName.toLowerCase().includes(search.toLowerCase()) ||
        fish.scientificName.toLowerCase().includes(search.toLowerCase()) ||
        fish.description.toLowerCase().includes(search.toLowerCase());

      const matchesFamily = !family || fish.family === family;
      const matchesHabitat = !habitat || fish.habitat.toLowerCase().includes(habitat.toLowerCase());

      return matchesSearch && matchesFamily && matchesHabitat;
    });

    this.setState({
      filteredFish: filtered,
      filters: { search, family, habitat },
      currentPage: 1
    });

    this.applySorting();
    this.emit('filtersApplied', { search, family, habitat, resultCount: filtered.length });
  }

  resetFilters() {
    this.setState({
      filteredFish: [...this.state.allFish],
      filters: { search: '', family: '', habitat: '' },
      currentPage: 1
    });

    this.applySorting();
    this.emit('filtersReset');
  }

  // =============================================
  // GESTIÓN DE ERRORES
  // =============================================
  handleError(message) {
    this.setState({
      hasError: true,
      errorMessage: message,
      isLoading: false
    });

    console.error('❌ Error en FishLibrary:', message);
    this.emit('error', { message });
  }

  // =============================================
  // MÉTODOS PÚBLICOS
  // =============================================
  async reload() {
    console.log('🔄 Recargando biblioteca...');
    this.cache.clear();
    this.setState({
      hasError: false,
      currentPage: 1,
      filters: { search: '', family: '', habitat: '' }
    });

    await this.loadFishData();
    this.emit('libraryReloaded');
  }

  getStats() {
    const families = [...new Set(this.state.allFish.map(f => f.family).filter(Boolean))];
    const habitats = [...new Set(this.state.allFish.map(f => f.habitat).filter(Boolean))];
    const withVideos = this.state.allFish.filter(f => f.video).length;
    const withWikipedia = this.state.allFish.filter(f => f.wikipedia).length;

    return {
      totalFish: this.state.allFish.length,
      filteredFish: this.state.filteredFish.length,
      families: families.length,
      habitats: habitats.length,
      withVideos,
      withWikipedia,
      familyList: families.sort(),
      habitatList: habitats.sort(),
      currentPage: this.state.currentPage,
      totalPages: Math.ceil(this.state.filteredFish.length / this.state.itemsPerPage)
    };
  }

  searchFish(query) {
    this.filterFish(query);
  }

  getFishById(id) {
    return this.state.allFish.find(fish => fish.id === id);
  }

  getFishByFamily(family) {
    return this.state.allFish.filter(fish => fish.family === family);
  }

  getRandomFish(count = 1) {
    const shuffled = [...this.state.allFish].sort(() => 0.5 - Math.random());
    return count === 1 ? shuffled[0] : shuffled.slice(0, count);
  }

  // =============================================
  // UTILIDADES INTERNAS
  // =============================================
  showNotification(message, type = 'info') {
    // Crear notificación toast simple
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

    document.body.appendChild(toast);

    // Auto-remove después de 3 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  pauseAnimations() {
    if (this.swiper && this.swiper.autoplay) {
      this.swiper.autoplay.stop();
    }
  }

  resumeAnimations() {
    if (this.swiper && this.swiper.autoplay) {
      this.swiper.autoplay.start();
    }
  }

  // =============================================
  // MÉTODOS DE DESARROLLO/DEBUG
  // =============================================
  debug() {
    return {
      state: this.getState(),
      stats: this.getStats(),
      cache: {
        size: this.cache.cache.size,
        keys: Array.from(this.cache.cache.keys())
      },
      elements: Object.keys(this.elements).filter(key => this.elements[key]),
      swiper: !!this.swiper
    };
  }

  exportData() {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      fish: this.state.allFish,
      stats: this.getStats()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fish-library-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}

class AvesLibrary extends ImprovedFishLibrary {
  async fetchFishDataFromAPI() {
    try {
      const response = await fetch('https://avesmallorquinas.com/assets/json/Ave.json'); // o URL si está en remoto
      if (!response.ok) throw new Error('Error al cargar Ave.json');
      const data = await response.json();
      const aves = this.extractFishFromData(data);

      this.cache.set('birdData', aves);
      return aves;
    } catch (e) {
      console.warn('⚠️ Error cargando aves:', e.message);
      return [];
    }
  }

  extractFishFromData(data) {
  if (!data.species || !Array.isArray(data.species)) return [];

  return data.species.map((bird, index) => {
    const habitat = bird.hasDefinedTerm?.find(t => t.termCode === 'habitat')?.description || '';
    const estaciones = bird.hasDefinedTerm?.find(t => t.termCode === 'season')?.description || '';
    const distribucion = bird.additionalProperty?.find(p => p.name === 'Zona de distribución')?.description || '';

    const video = bird.subjectOf?.find(m => m.contentUrl.includes('youtube.com'))?.contentUrl || '';
    const audio = bird.subjectOf?.find(m => m.encodingFormat === 'audio/wav')?.contentUrl || '';
    const imagePaths = [
      bird.image[0],
      bird.image[1],
      bird.image[2],
    ];
    console.log(imagePaths);

    return {
      id: bird.identifier || `bird_${index}`,
      commonName: bird.name || 'Sin nombre',
      scientificName: bird.alternateName || '',
      description: bird.description || '',
      disambiguation: bird.disambiguatingDescription || '',
      habitat,
      distribution: distribucion,
      video,
      audio,
      imagePaths, // ✅ Path directo
      family: bird.parentTaxon?.name || 'Sin clasificar'
    };
  });
  }

  createFishCard(fish) {
    const imagePath = fish.imagePaths[0];
    const cardId = `fish-card-${fish.id}`;

    return `
    <article class="card h-100 fish-card" 
             data-fish-id="${fish.id}" 
             id="${cardId}"
             role="button" 
             tabindex="0"
             aria-label="Ver información de ${Utils.escapeHtml(fish.commonName)}">
      <img class="card-img-top" 
           src="${imagePath}" 
           alt="${Utils.escapeHtml(fish.commonName)} (${Utils.escapeHtml(fish.scientificName)})"
           loading="lazy"
           onerror="this.src='${CONFIG.fallbackImage}'; this.style.objectFit='contain';" />
      <div class="card-body p-4">
        <div class="text-center">
          <h5 class="fw-bolder">${Utils.escapeHtml(fish.commonName)}</h5>
          <p class="text-muted fst-italic">${Utils.escapeHtml(fish.scientificName)}</p>
          ${fish.family ? `<small class="text-primary">Familia: ${Utils.escapeHtml(fish.family)}</small>` : ''}
        </div>
      </div>
    </article>
  `;
  }

  renderModalContent(fish) {
      if (!this.elements.modalTitle || !this.elements.modalBody) return;
  
      this.elements.modalTitle.textContent = fish.commonName;
  
      // Extraer ID de YouTube si existe
      const youtubeId = Utils.extractYouTubeId(fish.video);
  
      // Crear slides para el swiper
      const swiperSlides = fish.imagePaths.map((imagePath, index) => {
        if (index === 2 && youtubeId) {
          // Tercer slide con video de YouTube
          return `
            <div class="swiper-slide">
              <div class="youtube-container" data-youtube-id="${youtubeId}">
                <img src="https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg" 
                     class="youtube-thumbnail" 
                     alt="${Utils.escapeHtml(fish.commonName)} - Video"
                     onerror="this.src='${CONFIG.fallbackImage}';">
                <div class="pulsating-play-btn" onclick="fishLibrary.loadYouTubeVideo('${youtubeId}', this.parentElement)">
                  <i class="bi bi-play-fill"></i>
                </div>
              </div>
            </div>
          `;
        } else {
          // Slides normales de imágenes
          return `
            <div class="swiper-slide">
              <img src="${imagePath}" 
                   alt="${Utils.escapeHtml(fish.commonName)} - Imagen ${index + 1}" 
                   onerror="this.src='${CONFIG.fallbackImage}'; this.style.objectFit='contain';">
            </div>
          `;
        }
      }).join('');
  
      // Verificar si Speech Synthesis está disponible
      const speechSupported = speechManager && speechManager.isSupported();
      const speechButtonHTML = speechSupported ? `
        <div class="speech-controls mb-3">
          <button id="speechPlayButton" class="btn btn-outline-primary btn-sm speech-btn" onclick="toggleSpeech()">
            <i class="bi bi-volume-up-fill"></i>
            <span class="button-text">Escuchar</span>
          </button>
          <small class="text-muted ms-2">Escucha la descripción en audio</small>
        </div>
      ` : '';
  
      this.elements.modalBody.innerHTML = `
        <!-- Sección de imágenes con slider -->
        <div class="fish-image-section">
          <div class="fish-details-slider swiper">
            <div class="swiper-wrapper">
              ${swiperSlides}
            </div>
            <div class="swiper-pagination"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
          </div>
        </div>
        
        <!-- Información del pez -->
        <div class="fish-info-section">
          <div class="fish-info-grid">
            <!-- Columna izquierda -->
            <div class="fish-basic-info">
              <div class="fish-names">
                <h4>${Utils.escapeHtml(fish.commonName)}</h4>
                <p>${Utils.escapeHtml(fish.scientificName)}</p>
              </div>
              
              ${fish.family ? `
                <div class="info-item">
                  <h6><i class="bi bi-collection"></i>Familia</h6>
                  <p>${Utils.escapeHtml(fish.family)}</p>
                </div>
              ` : ''}
              
              ${fish.habitat ? `
                <div class="info-item">
                  <h6><i class="bi bi-geo-alt"></i>Hábitat</h6>
                  <p>${Utils.escapeHtml(fish.habitat)}</p>
                </div>
              ` : ''}
              
              ${fish.distribution ? `
                <div class="info-item">
                  <h6><i class="bi bi-globe"></i>Distribución</h6>
                  <p>${Utils.escapeHtml(fish.distribution)}</p>
                </div>
              ` : ''}
              
              ${(fish.wikipedia || fish.video) ? `
                <div class="info-item">
                  <h6><i class="bi bi-link-45deg"></i>Enlaces externos</h6>
                  <div class="external-links">
                    ${fish.wikipedia ? `
                      <a href="${fish.wikipedia}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-wikipedia"></i> Wikipedia
                      </a>
                    ` : ''}
                    ${fish.video ? `
                      <a href="${fish.video}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-play-circle"></i> YouTube
                      </a>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <!-- Columna derecha -->
            <div class="fish-description">
              <h6><i class="bi bi-info-circle"></i>Descripción</h6>
              ${speechButtonHTML}
              <p>${Utils.escapeHtml(fish.description || 'No hay descripción disponible para esta especie.')}</p>
            </div>
          </div>
        </div>
      `;
    }
}


// =============================================
// INICIALIZACIÓN GLOBAL
// =============================================
let fishLibrary;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  try {
    let tipoBiblio = document.getElementsByTagName('title')[0].text;

    //Cargamos o aves o peces dependiendo del html que estemos
    if(tipoBiblio == "Biblioteca de Peces - Peixplorer"){
      console.log("Cargando la biblioteca de peces")
      fishLibrary = new ImprovedFishLibrary();
    }
    else if(tipoBiblio == "Biblioteca de Aves - Peixplorer"){
      console.log("Cargando la biblioteca de aves")
      fishLibrary = new AvesLibrary();
    }

    // Exponer globalmente para debugging
    window.fishLibrary = fishLibrary;

    // Event listeners para estadísticas
    fishLibrary.on('libraryReady', (stats) => {
      console.log('📊 Biblioteca lista. Estadísticas:', stats);
    });

    fishLibrary.on('error', (error) => {
      console.error('💥 Error en biblioteca:', error);
    });

    fishLibrary.on('cardClicked', (data) => {
      console.log('🖱️ Card clickeado:', data.fishId);
    });

  } catch (error) {
    console.error('💥 Error fatal inicializando biblioteca:', error);

    // Mostrar mensaje de error al usuario
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-3';
    errorDiv.innerHTML = `
    <h4>Error de inicialización</h4>
    <p>Hubo un problema al cargar la biblioteca de peces. Por favor, recarga la página.</p>
    <button class="btn btn-outline-danger" onclick="location.reload()">
      <i class="bi bi-arrow-clockwise"></i> Recargar página
    </button>
  `;

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(errorDiv, container.firstChild);
  }
});

// =============================================
// INICIALIZACIÓN DE AOS
// =============================================
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 600,
    easing: 'ease-in-out',
    once: true,
    mirror: false,
    offset: 100
  });
}

// =============================================
// ERROR BOUNDARY GLOBAL
// =============================================
window.addEventListener('error', (e) => {
  console.error('💥 Error global capturado:', e.error);

  if (fishLibrary && !fishLibrary.getState().hasError) {
    fishLibrary.handleError('Error inesperado en la aplicación');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 Promise rechazada:', e.reason);

  if (fishLibrary) {
    fishLibrary.handleError(`Error asíncrono: ${e.reason}`);
  }
});

// =============================================
// FUNCIONES GLOBALES PARA SPEECH
// =============================================

// Función global para controlar speech (llamada desde HTML)
function toggleSpeech() {
  console.log('🎤 toggleSpeech() llamado');
  
  if (!speechManager) {
    console.error('❌ speechManager no disponible');
    alert('Speech Synthesis no está disponible en este navegador');
    return;
  }

  if (!speechManager.isSupported()) {
    console.error('❌ Speech Synthesis no soportado');
    alert('Tu navegador no soporta síntesis de voz');
    return;
  }

  console.log('🔍 Estado actual:', speechManager.getStatus());
  
  try {
    speechManager.toggle();
  } catch (error) {
    console.error('❌ Error en toggle:', error);
    alert('Error al reproducir audio: ' + error.message);
  }
}

// Función para detener speech
function stopSpeech() {
  console.log('🛑 stopSpeech() llamado');
  if (speechManager) {
    speechManager.stop();
  }
} 

window.resetSpeech = function() {
  if (speechManager) {
    speechManager.forceStop();
    console.log('🔄 Speech reseteado completamente');
  }
};

// =============================================
// INICIALIZACIÓN DEL SPEECH MANAGER
// =============================================
// Variable global para el speech manager
let speechManager;
let speechManagerInitialized = false;

// Función de inicialización principal
function initializeSpeechManager() {
  if (speechManagerInitialized) {
    console.log('🎤 Speech Manager ya inicializado');
    return;
  }

  if ('speechSynthesis' in window) {
    try {
      // Crear nueva instancia del Chunked Speech Manager
      speechManager = new ChunkedSpeechManager();
      console.log('🎤 Chunked Speech Manager creado exitosamente');
      
      // Exponer globalmente para debugging
      window.speechManager = speechManager;
      window.toggleSpeech = toggleSpeech;
      window.stopSpeech = stopSpeech;
      
      speechManagerInitialized = true;
      
      // Test básico
      console.log('✅ Speech Manager inicializado:', speechManager.getStatus());
      
    } catch (error) {
      console.error('❌ Error inicializando Speech Manager:', error);
    }
  } else {
    console.warn('⚠️ Speech Synthesis API no disponible en este navegador');
  }
}

// Función global para controlar speech (llamada desde HTML)
function toggleSpeech() {
  console.log('🎤 toggleSpeech() llamado');
  
  if (!speechManager) {
    console.error('❌ speechManager no disponible');
    alert('Speech Synthesis no está disponible en este navegador');
    return;
  }

  if (!speechManager.isSupported()) {
    console.error('❌ Speech Synthesis no soportado');
    alert('Tu navegador no soporta síntesis de voz');
    return;
  }

  console.log('🔍 Estado actual:', speechManager.getStatus());
  
  try {
    speechManager.toggle();
  } catch (error) {
    console.error('❌ Error en toggle:', error);
    alert('Error al reproducir audio: ' + error.message);
  }
}

// Función para detener speech
function stopSpeech() {
  console.log('🛑 stopSpeech() llamado');
  if (speechManager) {
    speechManager.stop();
  }
}

// Función de reset para casos problemáticos
function resetSpeech() {
  if (speechManager) {
    speechManager.stop();
    console.log('🔄 Speech reseteado completamente');
  }
}

// Exponer función de reset globalmente
window.resetSpeech = resetSpeech;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSpeechManager);
} else {
  initializeSpeechManager();
}

// Event listeners para limpiar el speech cuando sea necesario
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-bs-dismiss="modal"]') || 
      e.target.closest('[data-bs-dismiss="modal"]')) {
    console.log('🚪 Modal cerrado, deteniendo speech');
    if (speechManager) {
      speechManager.stop();
    }
  }
});

// Detener speech al presionar Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && speechManager) {
    console.log('⚠️ Escape presionado, deteniendo speech');
    speechManager.stop();
  }
});

// =============================================
// FUNCIONES DE DEBUGGING
// =============================================

// Función para debuggear el estado completo
window.debugSpeech = function() {
  console.log('=== DEBUG SPEECH SYNTHESIS ===');
  console.log('Speech supported:', 'speechSynthesis' in window);
  console.log('Speech manager exists:', !!speechManager);
  console.log('Speech manager initialized:', speechManagerInitialized);
  
  if (speechManager) {
    console.log('Speech status:', speechManager.getStatus());
    console.log('Available voices:', speechSynthesis.getVoices().length);
    console.log('Detailed status:', speechManager.getDetailedStatus());
  }
  
  const button = document.getElementById('speechPlayButton');
  console.log('Button found:', !!button);
  console.log('Button classes:', button?.className);
  
  const descriptionText = document.querySelector('.fish-description p')?.textContent;
  console.log('Description text found:', !!descriptionText);
  console.log('Description length:', descriptionText?.length);
  
  return {
    supported: 'speechSynthesis' in window,
    managerExists: !!speechManager,
    initialized: speechManagerInitialized,
    buttonExists: !!button,
    textExists: !!descriptionText,
    status: speechManager ? speechManager.getStatus() : null
  };
};

// Test manual de speech
window.testSpeech = function(text = 'Esto es una prueba del nuevo sistema de síntesis de voz por chunks. Debería pausar y reanudar correctamente.') {
  console.log('🧪 Probando chunked speech synthesis...');
  
  if (!speechManager) {
    console.error('❌ No speech manager');
    return;
  }
  
  try {
    speechManager.testWithText(text);
    console.log('✅ Test iniciado');
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
};

// Información del progreso del speech
window.getSpeechProgress = function() {
  if (speechManager) {
    const status = speechManager.getStatus();
    console.log(`📊 Progreso: ${status.progress} (${status.currentChunk}/${status.totalChunks} chunks)`);
    return status;
  }
  return null;
};

// =============================================
// UTILIDADES ADICIONALES
// =============================================

/**
* Función global para cargar video de YouTube (llamada desde HTML)
*/
window.loadYouTubeVideo = function (videoId, container) {
  if (fishLibrary) {
    fishLibrary.loadYouTubeVideo(videoId, container);
  }
};

/**
* Función de búsqueda externa
*/
window.searchFish = function (query) {
  if (fishLibrary) {
    fishLibrary.searchFish(query);
  }
};

/**
* Analytics simple
*/
const trackEvent = (action, category = 'Fish Library', label = '') => {
  console.log(`📈 Evento: ${category} - ${action}${label ? ` (${label})` : ''}`);

  // Aquí integrarías con Google Analytics, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
};

// =============================================
// KEYBOARD SHORTCUTS GLOBALES
// =============================================
document.addEventListener('keydown', (e) => {
  // Solo si no hay modales abiertos y no se está escribiendo
  if (document.activeElement.tagName === 'INPUT' ||
    document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  if (!fishLibrary || fishLibrary.isModalOpen()) return;

  switch (e.key) {
    case 'r':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        fishLibrary.reload();
      }
      break;
    case 'Home':
      fishLibrary.goToPage(1);
      break;
    case 'End':
      const stats = fishLibrary.getStats();
      fishLibrary.goToPage(stats.totalPages);
      break;
    case 'ArrowLeft':
      if (e.altKey) {
        e.preventDefault();
        const currentPage = fishLibrary.getState().currentPage;
        fishLibrary.goToPage(currentPage - 1);
      }
      break;
    case 'ArrowRight':
      if (e.altKey) {
        e.preventDefault();
        const currentPage = fishLibrary.getState().currentPage;
        fishLibrary.goToPage(currentPage + 1);
      }
      break;
  }
});

// =============================================
// EXPORT PARA MÓDULOS (OPCIONAL)
// =============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImprovedFishLibrary, Utils, CONFIG };
}/**
* BIBLIOTECA DE PECES - SISTEMA MEJORADO
* =====================================
* Sistema completo de gestión de la biblioteca de peces
* con arquitectura moderna, manejo de errores robusto y optimizaciones de rendimiento
*/

// =============================================
// DATOS DE EJEMPLO PARA DEMOSTRACIÓN
// =============================================
const SAMPLE_FISH_DATA = [
  {
    id: "1",
    scientificName: "Epinephelus marginatus",
    commonName: "Mero",
    description: "El mero es un pez de gran tamaño que habita en fondos rocosos del Mediterráneo. Es una especie protegida debido a la sobrepesca y su lento crecimiento. Puede alcanzar hasta 1.5 metros de longitud y pesar más de 60 kg.",
    habitat: "Fondos rocosos, cuevas submarinas, coralígeno",
    distribution: "Mediterráneo occidental, Atlántico oriental",
    family: "Serranidae",
    video: "https://www.youtube.com/watch?v=example1",
    wikipedia: "https://es.wikipedia.org/wiki/Epinephelus_marginatus"
  },
  {
    id: "2",
    scientificName: "Diplodus sargus",
    commonName: "Sargo",
    description: "Pez muy común en aguas mediterráneas, caracterizado por sus bandas verticales oscuras. Es muy apreciado en la pesca deportiva y gastronómicamente. Presenta dimorfismo sexual y cambios de coloración según la edad.",
    habitat: "Praderas de posidonia, fondos arenosos, proximidades de puertos",
    distribution: "Mediterráneo, Atlántico oriental hasta Senegal",
    family: "Sparidae",
    video: "",
    wikipedia: "https://es.wikipedia.org/wiki/Diplodus_sargus"
  },
  {
    id: "3",
    scientificName: "Sparus aurata",
    commonName: "Dorada",
    description: "La dorada es uno de los peces más valorados gastronómicamente del Mediterráneo. Se reconoce por la banda dorada entre sus ojos. Es hermafrodita protándrico: nace macho y se convierte en hembra con la edad.",
    habitat: "Fondos arenosos y fangosos, lagunas costeras",
    distribution: "Mediterráneo, Atlántico oriental, Mar Negro",
    family: "Sparidae",
    video: "https://www.youtube.com/watch?v=example3",
    wikipedia: "https://es.wikipedia.org/wiki/Sparus_aurata"
  },
  {
    id: "4",
    scientificName: "Coris julis",
    commonName: "Julia",
    description: "Pez de colores vivos que cambia de sexo durante su vida. Los machos presentan una coloración más llamativa con tonos azules y naranjas. Es muy activo durante el día y se entierra en la arena por la noche.",
    habitat: "Praderas de posidonia, fondos rocosos hasta 120m",
    distribution: "Mediterráneo, Atlántico oriental",
    family: "Labridae",
    video: "",
    wikipedia: "https://es.wikipedia.org/wiki/Coris_julis"
  },
  {
    id: "5",
    scientificName: "Thalassoma pavo",
    commonName: "Tordo",
    description: "Pez limpiador que se alimenta de parásitos de otros peces. Presenta dimorfismo sexual muy marcado: las hembras son pardas y los machos tienen colores brillantes. Es hermafrodita protogínico.",
    habitat: "Arrecifes rocosos, praderas de posidonia",
    distribution: "Mediterráneo oriental y central",
    family: "Labridae",
    video: "https://www.youtube.com/watch?v=example5",
    wikipedia: "https://es.wikipedia.org/wiki/Thalassoma_pavo"
  },
  {
    id: "6",
    scientificName: "Chromis chromis",
    commonName: "Castañuela",
    description: "Pequeño pez gregario de color azul intenso. Forma grandes cardúmenes cerca de estructuras rocosas. Los juveniles son de color azul brillante, mientras que los adultos pueden volverse más parduzcos.",
    habitat: "Fondos rocosos, arrecifes, formaciones coralígenas",
    distribution: "Mediterráneo, Atlántico oriental hasta Angola",
    family: "Pomacentridae",
    video: "",
    wikipedia: "https://es.wikipedia.org/wiki/Chromis_chromis"
  },
  {
    id: "7",
    scientificName: "Mullus surmuletus",
    commonName: "Salmonete de roca",
    description: "Pez bentónico que utiliza sus barbillones para buscar invertebrados en el sedimento. Su coloración puede cambiar rápidamente según el estado de ánimo y el entorno. Es muy apreciado en gastronomía.",
    habitat: "Fondos rocosos y arenosos, praderas de algas",
    distribution: "Mediterráneo, Atlántico oriental",
    family: "Mullidae",
    video: "https://www.youtube.com/watch?v=example7",
    wikipedia: "https://es.wikipedia.org/wiki/Mullus_surmuletus"
  },
  {
    id: "8",
    scientificName: "Serranus cabrilla",
    commonName: "Cabrilla",
    description: "Pequeño serránido hermafrodita simultáneo, lo que significa que posee órganos reproductores de ambos sexos al mismo tiempo. Es un depredador voraz de pequeños peces e invertebrados.",
    habitat: "Fondos rocosos, cuevas, grietas",
    distribution: "Mediterráneo, Atlántico oriental",
    family: "Serranidae",
    video: "",
    wikipedia: "https://es.wikipedia.org/wiki/Serranus_cabrilla"
  }
];

// =============================================
// CONFIGURACIÓN GLOBAL
// =============================================
const CONFIG = {
  itemsPerPage: 6,
  maxRetries: 3,
  retryDelay: 1000,
  loadingDelay: 800,
  imageTimeout: 5000,
  debounceDelay: 300,
  apiEndpoint: 'json/fish.json',
  fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNkZWUyZTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIvPgo8dGV4dCB4PSIyMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5CgPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD4KPHN2Zz4='
};

// =============================================
// UTILIDADES GLOBALES
// =============================================
const Utils = {
  /**
   * Escapar HTML para prevenir XSS
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Debounce para búsquedas
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle para eventos de scroll/resize
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Generar rutas de imágenes
   */
  getFishImagePath(fishId, prefix = '01_') {
    return `assets/img/fishes/${prefix}${fishId}.webp`;
  },

  /**
   * Obtener imagen de respaldo
   */
  getFallbackImage() {
    return CONFIG.fallbackImage;
  },

  /**
   * Extraer ID de YouTube de una URL
   */
  extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  },

  /**
   * Formatear números con separadores de miles
   */
  formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  },

  /**
   * Validar si un elemento está en viewport
   */
  isInViewport(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Scroll suave a elemento
   */
  smoothScrollTo(element, offset = 80) {
    if (!element) return;
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  },

  /**
   * Crear elemento DOM desde HTML string
   */
  createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
  },

  /**
   * Detectar dispositivo móvil
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Generar ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}