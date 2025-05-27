/**
 * ===================================
 * QUIZ APPLICATION - ENHANCED WITH CHART
 * ===================================
 */

class QuizApp {
  constructor() {
    this.CONFIG = {
      TOTAL_QUESTIONS: 10,
      COUNTDOWN_TIME: 1000,
      STORAGE_KEY: 'fishQuizStats',
      QUESTIONS_FILE: 'json/quiz.json',
      MAX_STORED_GAMES: 50
    };

    this.state = {
      currentQuestionIndex: 0,
      selectedAnswerIndex: null,
      allQuestions: [],
      quizQuestions: [],
      userAnswers: [],
      quizStartTime: null,
      countdownInterval: null,
      isQuizActive: false
    };

    this.elements = {};
    this.init();
  }

  async init() {
    try {
      this.cacheDOMElements();
      this.bindEventListeners();
      await this.loadQuestions();
      this.displayStats();
      this.hidePreloader();
    } catch (error) {
      this.handleError('Error initializing quiz application', error);
    }
  }

  cacheDOMElements() {
    // Navigation elements
    this.elements.mainMenu = document.getElementById('main-menu');
    this.elements.statsView = document.getElementById('stats-view');
    this.elements.startQuizBtn = document.getElementById('start-quiz-btn');
    this.elements.viewStatsBtn = document.getElementById('view-stats-btn');
    this.elements.backToMenuBtn = document.getElementById('back-to-menu');

    // Chart elements
    this.elements.showChartBtn = document.getElementById('show-chart-btn');
    this.elements.chartModal = new bootstrap.Modal(document.getElementById('chartModal'));
    this.elements.chartModalElement = document.getElementById('chartModal');
    this.elements.progressChart = document.getElementById('progress-chart');
    this.elements.chartStats = document.getElementById('chart-stats');
    this.elements.chartTooltip = document.getElementById('chart-tooltip');
    this.elements.noDataMessage = document.getElementById('no-data-message');

    // Modal elements
    this.elements.quizModal = new bootstrap.Modal(document.getElementById('quizModal'), {
      backdrop: 'static',
      keyboard: false
    });
    this.elements.quizModalElement = document.getElementById('quizModal');
    this.elements.quizView = document.getElementById('quiz-view');
    this.elements.resultsView = document.getElementById('results-view');

    // Quiz elements
    this.elements.questionNumber = document.getElementById('question-number');
    this.elements.progressText = document.getElementById('progress-text');
    this.elements.questionText = document.getElementById('question-text');
    this.elements.answersContainer = document.getElementById('answers');
    this.elements.feedback = document.getElementById('feedback');
    this.elements.quizProgress = document.getElementById('quiz-progress');
    this.elements.countdownContainer = document.getElementById('countdown-container');
    this.elements.countdownBar = document.getElementById('countdown-bar');

    // Result elements
    this.elements.resultsButtons = document.getElementById('results-buttons');
    this.elements.playAgainBtn = document.getElementById('play-again-btn');
    this.elements.backToMenuFromResults = document.getElementById('back-to-menu-from-results');
    this.elements.finalScoreTitle = document.getElementById('final-score-title');
    this.elements.finalScore = document.getElementById('final-score');
    this.elements.resultsMessage = document.getElementById('results-message');
    this.elements.questionsReview = document.getElementById('questions-review');

    // Statistics elements
    this.elements.totalGames = document.getElementById('total-games');
    this.elements.avgScore = document.getElementById('avg-score');
    this.elements.bestScore = document.getElementById('best-score');
    this.elements.totalCorrect = document.getElementById('total-correct');
    this.elements.gamesList = document.getElementById('games-list');

    this.elements.preloader = document.getElementById('preloader');
  }

  bindEventListeners() {
    // Navigation events
    this.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
    this.elements.startQuizBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.startQuiz();
      }
    });

    this.elements.viewStatsBtn?.addEventListener('click', () => this.showStats());
    this.elements.viewStatsBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.showStats();
      }
    });

    this.elements.backToMenuBtn?.addEventListener('click', () => this.showMainMenu());

    // Chart events
    this.elements.showChartBtn?.addEventListener('click', () => this.showChart());

    // Result buttons
    this.elements.playAgainBtn?.addEventListener('click', () => this.restartQuiz());
    this.elements.backToMenuFromResults?.addEventListener('click', () => this.closeModalAndShowMenu());

    // Modal events
    this.elements.quizModalElement?.addEventListener('hidden.bs.modal', () => {
      if (!this.state.isQuizActive) {
        this.resetQuiz();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

    // Window events
    window.addEventListener('beforeunload', (e) => {
      if (this.state.isQuizActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  handleKeyboardNavigation(event) {
    if (!this.state.isQuizActive) return;

    const { key } = event;

    if (key >= '1' && key <= '4') {
      const answerIndex = parseInt(key) - 1;
      const answerButtons = this.elements.answersContainer.querySelectorAll('.answer-button');
      if (answerButtons[answerIndex] && !answerButtons[answerIndex].disabled) {
        event.preventDefault();
        answerButtons[answerIndex].click();
      }
    }

    if (key === 'Escape' && this.state.isQuizActive) {
      if (confirm('¿Estás seguro de que quieres salir del quiz? Se perderá tu progreso.')) {
        this.closeModalAndShowMenu();
      }
    }
  }

  async loadQuestions() {
    try {
      const response = await fetch(this.CONFIG.QUESTIONS_FILE);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.hasPart || !Array.isArray(data.hasPart)) {
        throw new Error('Invalid questions data format');
      }

      this.state.allQuestions = data.hasPart;

      if (this.state.allQuestions.length < this.CONFIG.TOTAL_QUESTIONS) {
        console.warn(`Only ${this.state.allQuestions.length} questions available, less than required ${this.CONFIG.TOTAL_QUESTIONS}`);
      }

    } catch (error) {
      this.handleError('Error loading questions', error);
      throw error;
    }
  }

  hidePreloader() {
    if (this.elements.preloader) {
      this.elements.preloader.style.opacity = '0';
      setTimeout(() => {
        this.elements.preloader.style.display = 'none';
      }, 300);
    }
  }

  // ===================================
  // CHART METHODS
  // ===================================

  showChart() {
    const stats = this.getStoredStats();
    const games = stats.games;

    if (games.length < 2) {
      this.elements.noDataMessage.style.display = 'block';
      this.elements.progressChart.style.display = 'none';
      this.elements.chartStats.style.display = 'none';
    } else {
      this.elements.noDataMessage.style.display = 'none';
      this.elements.progressChart.style.display = 'block';
      this.elements.chartStats.style.display = 'grid';
      this.generateChart(games);
      this.generateChartStats(games);
    }

    this.elements.chartModal.show();
  }

  generateChartStats(games) {
    const calculations = this.calculateStatistics(games);
    const trend = this.calculateTrend(games);
    const lastGames = games.slice(-5);
    const recentAvg = lastGames.length > 0 ?
      Math.round(lastGames.reduce((sum, game) => sum + (game.score || 0), 0) / lastGames.length) : 0;

    this.elements.chartStats.innerHTML = `
          <div class="chart-stat-item">
            <div class="chart-stat-value">${calculations.totalGames}</div>
            <div class="chart-stat-label">Total Partidas</div>
          </div>
          <div class="chart-stat-item">
            <div class="chart-stat-value">${calculations.avgScore}%</div>
            <div class="chart-stat-label">Promedio General</div>
          </div>
          <div class="chart-stat-item">
            <div class="chart-stat-value">${recentAvg}%</div>
            <div class="chart-stat-label">Últimas 5 Partidas</div>
          </div>
          <div class="chart-stat-item">
            <div class="chart-stat-value" style="color: ${trend >= 0 ? '#28a745' : '#dc3545'}">
              ${trend >= 0 ? '+' : ''}${trend}%
            </div>
            <div class="chart-stat-label">Tendencia</div>
          </div>
        `;
  }

  calculateTrend(games) {
    if (games.length < 4) return 0;

    const firstHalf = games.slice(0, Math.floor(games.length / 2));
    const secondHalf = games.slice(Math.floor(games.length / 2));

    const firstAvg = firstHalf.reduce((sum, game) => sum + (game.score || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, game) => sum + (game.score || 0), 0) / secondHalf.length;

    return Math.round(secondAvg - firstAvg);
  }

  generateChart(games) {
    const svg = this.elements.progressChart;
    svg.innerHTML = '';

    // Chart dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 900;
    const height = 400;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Set SVG dimensions
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Create chart group
    const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chartGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(chartGroup);

    // Prepare data
    const chartData = games.map((game, index) => ({
      x: index,
      y: game.score || 0,
      date: new Date(game.date),
      game: game
    }));

    // Calculate moving average
    const movingAverage = [];
    const windowSize = 3;
    for (let i = 0; i < chartData.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = chartData.slice(start, i + 1);
      const avg = window.reduce((sum, d) => sum + d.y, 0) / window.length;
      movingAverage.push({ x: i, y: avg });
    }

    // Scales
    const xScale = (x) => (x / (chartData.length - 1)) * chartWidth;
    const yScale = (y) => chartHeight - (y / 100) * chartHeight;

    // Draw grid lines
    this.drawGrid(chartGroup, chartWidth, chartHeight);

    // Draw axes
    this.drawAxes(chartGroup, chartWidth, chartHeight, chartData);

    // Draw moving average line
    if (movingAverage.length > 1) {
      this.drawLine(chartGroup, movingAverage, xScale, yScale, '#667eea', 2, 'chart-line');
    }

    // Draw main score line
    this.drawLine(chartGroup, chartData, xScale, yScale, '#2c5aa0', 3, 'chart-line');

    // Draw data points
    chartData.forEach((d, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', xScale(d.x));
      circle.setAttribute('cy', yScale(d.y));
      circle.setAttribute('r', 6);
      circle.setAttribute('fill', '#2c5aa0');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', 2);
      circle.classList.add('chart-dot');
      circle.style.animationDelay = `${i * 0.1 + 2}s`;

      // Add tooltip functionality
      this.addTooltip(circle, d);

      chartGroup.appendChild(circle);
    });
  }

  drawGrid(group, width, height) {
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'grid');

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e9ecef');
      line.setAttribute('stroke-width', 1);
      gridGroup.appendChild(line);
    }

    group.appendChild(gridGroup);
  }

  drawAxes(group, width, height, data) {
    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Y-axis line
    const yLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yLine.setAttribute('x1', 0);
    yLine.setAttribute('y1', 0);
    yLine.setAttribute('x2', 0);
    yLine.setAttribute('y2', height);
    yLine.setAttribute('stroke', '#495057');
    yLine.setAttribute('stroke-width', 2);
    yAxis.appendChild(yLine);

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = (100 / 4) * (4 - i);
      const y = (height / 4) * i;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', -10);
      text.setAttribute('y', y + 5);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6c757d');
      text.textContent = `${value}%`;
      yAxis.appendChild(text);
    }

    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // X-axis line
    const xLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xLine.setAttribute('x1', 0);
    xLine.setAttribute('y1', height);
    xLine.setAttribute('x2', width);
    xLine.setAttribute('y2', height);
    xLine.setAttribute('stroke', '#495057');
    xLine.setAttribute('stroke-width', 2);
    xAxis.appendChild(xLine);

    // X-axis title
    const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xTitle.setAttribute('x', width / 2);
    xTitle.setAttribute('y', height + 35);
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.setAttribute('font-size', '14');
    xTitle.setAttribute('fill', '#495057');
    xTitle.setAttribute('font-weight', '600');
    xTitle.textContent = 'Partidas';
    xAxis.appendChild(xTitle);

    // Y-axis title
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('x', -height / 2);
    yTitle.setAttribute('y', -35);
    yTitle.setAttribute('text-anchor', 'middle');
    yTitle.setAttribute('font-size', '14');
    yTitle.setAttribute('fill', '#495057');
    yTitle.setAttribute('font-weight', '600');
    yTitle.setAttribute('transform', `rotate(-90, -${height / 2}, -35)`);
    yTitle.textContent = 'Puntuación (%)';
    yAxis.appendChild(yTitle);

    group.appendChild(yAxis);
    group.appendChild(xAxis);
  }

  drawLine(group, data, xScale, yScale, color, strokeWidth, className) {
    if (data.length < 2) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    let pathData = `M ${xScale(data[0].x)} ${yScale(data[0].y)}`;
    for (let i = 1; i < data.length; i++) {
      pathData += ` L ${xScale(data[i].x)} ${yScale(data[i].y)}`;
    }

    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    if (className) {
      path.classList.add(className);
    }

    group.appendChild(path);
  }

  addTooltip(element, data) {
    element.addEventListener('mouseenter', (e) => {
      const tooltip = this.elements.chartTooltip;
      const formatDate = data.date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      tooltip.innerHTML = `
            <strong>Partida ${data.x + 1}</strong><br>
            Puntuación: ${data.y}%<br>
            Fecha: ${formatDate}
          `;

      tooltip.classList.add('show');
    });

    element.addEventListener('mousemove', (e) => {
      const tooltip = this.elements.chartTooltip;
      const rect = this.elements.chartModalElement.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    });

    element.addEventListener('mouseleave', () => {
      this.elements.chartTooltip.classList.remove('show');
    });
  }

  // ===================================
  // NAVIGATION METHODS
  // ===================================

  showMainMenu() {
    this.elements.mainMenu.style.display = 'block';
    this.elements.statsView.style.display = 'none';

    this.elements.mainMenu.classList.add('fade-in');
    this.elements.startQuizBtn?.focus();
  }

  showStats() {
    this.elements.mainMenu.style.display = 'none';
    this.elements.statsView.style.display = 'block';

    this.elements.statsView.classList.add('fade-in');
    this.displayStats();
    this.elements.backToMenuBtn?.focus();
  }

  // ===================================
  // QUIZ MANAGEMENT (Original methods preserved)
  // ===================================

  async startQuiz() {
    try {
      if (this.state.allQuestions.length === 0) {
        throw new Error('Questions not loaded yet');
      }

      this.selectRandomQuestions();
      this.resetQuizState();
      this.state.quizStartTime = new Date();
      this.state.isQuizActive = true;

      this.showQuizModal();
      await this.showQuestion();

    } catch (error) {
      this.handleError('Error starting quiz', error);
    }
  }

  selectRandomQuestions() {
    const availableQuestions = [...this.state.allQuestions];
    const questionsNeeded = Math.min(this.CONFIG.TOTAL_QUESTIONS, availableQuestions.length);

    for (let i = availableQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
    }

    this.state.quizQuestions = availableQuestions.slice(0, questionsNeeded);
  }

  resetQuizState() {
    this.state.currentQuestionIndex = 0;
    this.state.selectedAnswerIndex = null;
    this.state.userAnswers = [];
    this.clearCountdown();

    if (this.elements.feedback) {
      this.elements.feedback.classList.add('d-none');
      this.elements.feedback.innerHTML = '';
    }

    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }
  }

  showQuizModal() {
    this.elements.quizView.style.display = 'block';
    this.elements.resultsView.style.display = 'none';
    this.elements.resultsButtons.style.display = 'none';

    this.elements.quizModal.show();
  }

  async showQuestion() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const questionNumber = this.state.currentQuestionIndex + 1;
    const totalQuestions = this.state.quizQuestions.length;

    this.elements.questionNumber.textContent = `Pregunta ${questionNumber}`;
    this.elements.progressText.textContent = `${questionNumber} de ${totalQuestions}`;
    this.elements.questionText.textContent = question.text;

    this.elements.answersContainer.innerHTML = '';

    question.suggestedAnswer.forEach((answer, index) => {
      const button = this.createAnswerButton(answer.text, index, questionNumber);
      this.elements.answersContainer.appendChild(button);
    });

    this.state.selectedAnswerIndex = null;
    this.elements.feedback.classList.add('d-none');
    this.elements.countdownContainer.classList.add('d-none');

    this.elements.feedback.innerHTML = '';

    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    this.updateProgress();

    this.elements.answersContainer.classList.add('fade-in');

    const firstAnswer = this.elements.answersContainer.querySelector('.answer-button');
    if (firstAnswer) {
      firstAnswer.focus();
    }
  }

  createAnswerButton(text, index, questionNumber) {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = text;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-describedby', 'question-text');
    button.setAttribute('data-answer-index', index);

    button.addEventListener('click', () => this.selectAndProcessAnswer(index, button));
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectAndProcessAnswer(index, button);
      }
    });

    return button;
  }

  selectAndProcessAnswer(index, buttonEl) {
    if (this.state.selectedAnswerIndex !== null) return;

    this.state.selectedAnswerIndex = index;
    buttonEl.classList.add('selected');
    buttonEl.setAttribute('aria-checked', 'true');

    this.lockAnswers();
    this.showFeedback();
    this.saveUserAnswer();

    this.startCountdown(() => {
      this.moveToNextQuestion();
    });
  }

  lockAnswers() {
    const buttons = this.elements.answersContainer.querySelectorAll('.answer-button');
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];

    buttons.forEach((button, index) => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');

      const isCorrect = question.suggestedAnswer[index].text === question.acceptedAnswer.text;

      if (isCorrect) {
        button.classList.add('correct');
        button.setAttribute('aria-label', `${button.textContent} - Respuesta correcta`);
      }

      if (index === this.state.selectedAnswerIndex && !isCorrect) {
        button.classList.add('incorrect');
        button.setAttribute('aria-label', `${button.textContent} - Respuesta incorrecta`);
      }
    });
  }

  showFeedback() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const selectedAnswer = question.suggestedAnswer[this.state.selectedAnswerIndex];
    const isCorrect = selectedAnswer.text === question.acceptedAnswer.text;

    this.elements.feedback.classList.remove('d-none', 'alert-success', 'alert-danger');
    this.elements.feedback.classList.add(isCorrect ? 'alert-success' : 'alert-danger');

    if (isCorrect) {
      this.elements.feedback.innerHTML = `
            <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
            <strong>¡Correcto!</strong> Has elegido la respuesta adecuada.
          `;
    } else {
      this.elements.feedback.innerHTML = `
            <i class="bi bi-x-circle-fill me-2" aria-hidden="true"></i>
            <strong>Incorrecto.</strong> La respuesta correcta es: ${question.acceptedAnswer.text}
          `;
    }

    this.elements.feedback.setAttribute('aria-live', 'polite');
  }

  saveUserAnswer() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const selectedAnswer = question.suggestedAnswer[this.state.selectedAnswerIndex];
    const isCorrect = selectedAnswer.text === question.acceptedAnswer.text;

    this.state.userAnswers.push({
      question: question,
      selectedAnswer: selectedAnswer,
      correctAnswer: question.acceptedAnswer,
      isCorrect: isCorrect,
      timeStamp: new Date()
    });
  }

  startCountdown(callback) {
    if (!this.elements.countdownContainer || !this.elements.countdownBar) {
      console.warn('Countdown elements not found');
      setTimeout(callback, this.CONFIG.COUNTDOWN_TIME);
      return;
    }

    this.elements.countdownContainer.classList.remove('d-none');

    this.elements.countdownBar.style.transition = 'none';
    this.elements.countdownBar.style.width = '0%';
    this.elements.countdownBar.classList.remove('animate');

    this.elements.countdownBar.offsetHeight;

    requestAnimationFrame(() => {
      this.elements.countdownBar.style.transition = `width ${this.CONFIG.COUNTDOWN_TIME}ms linear`;
      this.elements.countdownBar.classList.add('animate');
      this.elements.countdownBar.style.width = '100%';
    });

    this.state.countdownInterval = setTimeout(() => {
      this.elements.countdownContainer.classList.add('d-none');
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');

      callback();
    }, this.CONFIG.COUNTDOWN_TIME);
  }

  clearCountdown() {
    if (this.state.countdownInterval) {
      clearTimeout(this.state.countdownInterval);
      this.state.countdownInterval = null;
    }

    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }
  }

  moveToNextQuestion() {
    this.state.currentQuestionIndex++;

    if (this.state.currentQuestionIndex < this.state.quizQuestions.length) {
      this.showQuestion();
    } else {
      this.showResults();
    }
  }

  updateProgress() {
    const progress = Math.round((this.state.currentQuestionIndex / this.state.quizQuestions.length) * 100);
    this.elements.quizProgress.style.width = `${progress}%`;
    this.elements.quizProgress.setAttribute('aria-valuenow', progress);
  }

  // ===================================
  // RESULTS MANAGEMENT (Original methods preserved)
  // ===================================

  showResults() {
    this.state.isQuizActive = false;

    const correctAnswers = this.state.userAnswers.filter(answer => answer.isCorrect).length;
    const totalQuestions = this.state.userAnswers.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    this.elements.quizView.style.display = 'none';
    this.elements.resultsView.style.display = 'block';
    this.elements.resultsButtons.style.display = 'block';

    this.displayFinalScore(correctAnswers, totalQuestions, percentage);
    this.displayQuestionsReview();

    this.saveGameStats(correctAnswers, totalQuestions, percentage);

    this.elements.playAgainBtn?.focus();
  }

  displayFinalScore(correct, total, percentage) {
    const scoreData = this.getScoreData(percentage);

    this.elements.finalScoreTitle.textContent = scoreData.message;
    this.elements.finalScore.textContent = `${correct}/${total} (${percentage}%)`;
    this.elements.finalScore.className = `final-score-display ${scoreData.class}`;

    if (this.elements.resultsMessage) {
      this.elements.resultsMessage.textContent = scoreData.description;
    }
  }

  getScoreData(percentage) {
    if (percentage >= 90) {
      return {
        message: '¡Excelente!',
        class: 'excellent',
        description: 'Tienes un conocimiento excepcional sobre peces marinos.'
      };
    } else if (percentage >= 70) {
      return {
        message: '¡Muy bien!',
        class: 'good',
        description: 'Demuestras un buen conocimiento sobre la vida marina.'
      };
    } else if (percentage >= 50) {
      return {
        message: 'Bien hecho',
        class: 'fair',
        description: 'Tienes conocimientos básicos, pero puedes mejorar.'
      };
    } else {
      return {
        message: 'Sigue practicando',
        class: 'poor',
        description: 'Te recomendamos repasar más sobre peces marinos.'
      };
    }
  }

  displayQuestionsReview() {
    const reviewContainer = this.elements.questionsReview.querySelector('.review-container') ||
      this.elements.questionsReview;

    reviewContainer.innerHTML = '';

    this.state.userAnswers.forEach((userAnswer, index) => {
      const reviewItem = this.createQuestionReviewItem(userAnswer, index + 1);
      reviewContainer.appendChild(reviewItem);
    });
  }

  createQuestionReviewItem(userAnswer, questionNumber) {
    const item = document.createElement('article');
    item.className = 'question-review-item';
    item.setAttribute('aria-labelledby', `review-question-${questionNumber}`);

    const questionHeader = document.createElement('div');
    questionHeader.className = 'review-question-header';

    const numberBadge = document.createElement('div');
    numberBadge.className = 'question-number-badge';
    numberBadge.textContent = questionNumber;
    numberBadge.setAttribute('aria-label', `Pregunta número ${questionNumber}`);

    const questionText = document.createElement('h4');
    questionText.id = `review-question-${questionNumber}`;
    questionText.className = 'review-question-text';
    questionText.textContent = userAnswer.question.text;

    questionHeader.appendChild(numberBadge);
    questionHeader.appendChild(questionText);

    const answersContainer = document.createElement('div');
    answersContainer.className = 'review-answers';
    answersContainer.setAttribute('role', 'list');

    userAnswer.question.suggestedAnswer.forEach((answer, index) => {
      const answerEl = document.createElement('div');
      answerEl.className = 'review-answer';
      answerEl.setAttribute('role', 'listitem');

      const answerIcon = document.createElement('div');
      answerIcon.className = 'answer-icon';

      let answerText = answer.text;
      let className = 'neutral';
      let iconContent = String.fromCharCode(65 + index);

      if (answer.text === userAnswer.correctAnswer.text) {
        className = 'correct';
        iconContent = '✓';
        answerEl.setAttribute('aria-label', `Respuesta correcta: ${answer.text}`);
      } else if (answer.text === userAnswer.selectedAnswer.text && !userAnswer.isCorrect) {
        className = 'user-incorrect';
        iconContent = '✗';
        answerEl.setAttribute('aria-label', `Tu respuesta incorrecta: ${answer.text}`);
      } else {
        answerEl.setAttribute('aria-label', `Opción: ${answer.text}`);
      }

      answerIcon.textContent = iconContent;
      answerEl.classList.add(className);

      const answerContent = document.createElement('span');
      answerContent.className = 'answer-content';
      answerContent.textContent = answerText;

      answerEl.appendChild(answerIcon);
      answerEl.appendChild(answerContent);
      answersContainer.appendChild(answerEl);
    });

    const questionSummary = document.createElement('div');
    questionSummary.className = `question-summary ${userAnswer.isCorrect ? 'correct' : 'incorrect'}`;

    const summaryIcon = document.createElement('i');
    summaryIcon.className = `summary-icon bi ${userAnswer.isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`;
    summaryIcon.setAttribute('aria-hidden', 'true');

    const summaryText = document.createElement('span');
    if (userAnswer.isCorrect) {
      summaryText.textContent = '¡Respuesta correcta!';
    } else {
      summaryText.textContent = `Respuesta incorrecta. La correcta era: ${userAnswer.correctAnswer.text}`;
    }

    questionSummary.appendChild(summaryIcon);
    questionSummary.appendChild(summaryText);

    item.appendChild(questionHeader);
    item.appendChild(answersContainer);
    item.appendChild(questionSummary);

    return item;
  }

  // ===================================
  // STATISTICS MANAGEMENT (Original methods preserved)
  // ===================================

  saveGameStats(correctAnswers, totalQuestions, percentage) {
    const gameData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: percentage,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      duration: this.calculateQuizDuration(),
      answers: this.state.userAnswers.map(answer => ({
        question: answer.question.text,
        selected: answer.selectedAnswer.text,
        correct: answer.correctAnswer.text,
        isCorrect: answer.isCorrect
      }))
    };

    try {
      let stats = this.getStoredStats();
      stats.games.push(gameData);

      if (stats.games.length > this.CONFIG.MAX_STORED_GAMES) {
        stats.games = stats.games.slice(-this.CONFIG.MAX_STORED_GAMES);
      }

      this.saveStats(stats);
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  }

  calculateQuizDuration() {
    if (!this.state.quizStartTime) return 0;
    return Math.round((new Date() - this.state.quizStartTime) / 1000);
  }

  getStoredStats() {
    try {
      const stored = localStorage.getItem(this.CONFIG.STORAGE_KEY);
      if (stored) {
        const stats = JSON.parse(stored);
        return { games: Array.isArray(stats.games) ? stats.games : [] };
      }
    } catch (error) {
      console.error('Error parsing stored stats:', error);
    }

    return { games: [] };
  }

  saveStats(stats) {
    try {
      localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
    }
  }

  handleStorageQuotaExceeded() {
    try {
      const stats = this.getStoredStats();
      stats.games = stats.games.slice(-20);
      localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Unable to clean up storage:', error);
    }
  }

  displayStats() {
    const stats = this.getStoredStats();
    const games = stats.games;

    if (games.length === 0) {
      this.showEmptyStats();
      return;
    }

    const calculations = this.calculateStatistics(games);

    this.elements.totalGames.textContent = calculations.totalGames;
    this.elements.avgScore.textContent = `${calculations.avgScore}%`;
    this.elements.bestScore.textContent = `${calculations.bestScore}%`;
    this.elements.totalCorrect.textContent = calculations.totalCorrect;

    this.displayGamesHistory(games);
  }

  calculateStatistics(games) {
    const totalGames = games.length;
    const totalCorrect = games.reduce((sum, game) => sum + (game.correctAnswers || 0), 0);
    const avgScore = totalGames > 0 ? Math.round(games.reduce((sum, game) => sum + (game.score || 0), 0) / totalGames) : 0;
    const bestScore = totalGames > 0 ? Math.max(...games.map(game => game.score || 0)) : 0;

    return {
      totalGames,
      totalCorrect,
      avgScore,
      bestScore
    };
  }

  displayGamesHistory(games) {
    this.elements.gamesList.innerHTML = '';

    const recentGames = [...games].reverse().slice(0, 20);

    if (recentGames.length === 0) {
      this.showEmptyGamesList();
      return;
    }

    recentGames.forEach((game, index) => {
      const gameItem = this.createGameItem(game, index);
      this.elements.gamesList.appendChild(gameItem);
    });
  }

  createGameItem(game, index) {
    const item = document.createElement('article');
    item.className = 'game-item';
    item.setAttribute('aria-labelledby', `game-${index}-score`);

    const gameInfo = document.createElement('div');
    gameInfo.className = 'game-info';

    const dateEl = document.createElement('div');
    dateEl.className = 'game-date';
    dateEl.textContent = this.formatDate(game.date);

    const detailsEl = document.createElement('div');
    detailsEl.className = 'game-details';
    detailsEl.textContent = `${game.correctAnswers || 0}/${game.totalQuestions || this.CONFIG.TOTAL_QUESTIONS} correctas`;

    if (game.duration) {
      detailsEl.textContent += ` • ${this.formatDuration(game.duration)}`;
    }

    const scoreEl = document.createElement('div');
    scoreEl.id = `game-${index}-score`;
    scoreEl.className = `game-score ${this.getScoreClass(game.score || 0)}`;
    scoreEl.textContent = `${game.score || 0}%`;
    scoreEl.setAttribute('aria-label', `Puntuación: ${game.score || 0} por ciento`);

    gameInfo.appendChild(dateEl);
    gameInfo.appendChild(detailsEl);

    item.appendChild(gameInfo);
    item.appendChild(scoreEl);

    return item;
  }

  getScoreClass(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'fair';
    return 'poor';
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Hoy';
      if (diffDays === 2) return 'Ayer';
      if (diffDays <= 7) return `Hace ${diffDays - 1} días`;

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  showEmptyStats() {
    this.elements.totalGames.textContent = '0';
    this.elements.avgScore.textContent = '0%';
    this.elements.bestScore.textContent = '0%';
    this.elements.totalCorrect.textContent = '0';

    this.showEmptyGamesList();
  }

  showEmptyGamesList() {
    this.elements.gamesList.innerHTML = `
          <div class="empty-state">
            <i class="bi bi-graph-up text-muted" style="font-size: 3rem;"></i>
            <h4>No hay partidas registradas</h4>
            <p>Juega tu primer quiz para ver tus estadísticas aquí</p>
          </div>
        `;
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  restartQuiz() {
    this.resetQuiz();
    this.startQuiz();
  }

  closeModalAndShowMenu() {
    this.state.isQuizActive = false;
    this.elements.quizModal.hide();
    this.showMainMenu();
  }

  resetQuiz() {
    this.resetQuizState();
    this.state.isQuizActive = false;

    if (this.elements.answersContainer) {
      this.elements.answersContainer.innerHTML = '';
    }

    if (this.elements.feedback) {
      this.elements.feedback.classList.add('d-none');
      this.elements.feedback.innerHTML = '';
      this.elements.feedback.classList.remove('alert-success', 'alert-danger');
    }

    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }

    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    if (this.elements.quizProgress) {
      this.elements.quizProgress.style.width = '0%';
    }
  }

  handleError(message, error) {
    console.error(message, error);

    const errorMessage = this.getUserFriendlyErrorMessage(error);
    alert(`${message}: ${errorMessage}`);
  }

  getUserFriendlyErrorMessage(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'No se pudo cargar el contenido. Verifica tu conexión a internet.';
    }

    if (error.message.includes('questions')) {
      return 'Error al cargar las preguntas. Por favor, recarga la página.';
    }

    return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
  }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  try {
    new QuizApp();
  } catch (error) {
    console.error('Failed to initialize Quiz App:', error);

    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.innerHTML = `
            <div class="preloader-content">
              <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
              <h4>Error al cargar la aplicación</h4>
              <p>Por favor, recarga la página para intentar de nuevo.</p>
              <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                Recargar página
              </button>
            </div>
          `;
    }
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}